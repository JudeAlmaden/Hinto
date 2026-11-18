/**
 * Journey session (plan Phases 5 and 7).
 *
 * Orchestrates the pieces the alarm depends on: readiness, lifecycle state in
 * SQLite, the background location service, and honest recovery on launch.
 */

import { getDatabase } from '@/db/client';
import { selectPolicy } from '@/modules/geofence/policy';
import type { Destination } from '@/modules/places';
import type { ReadinessIssue } from '@/modules/permissions';
import { dismissAlarmPresentation } from '@/modules/alarm/delivery';
import { readBattery } from '@/modules/battery/service';
import { getReadinessIssues } from '@/modules/permissions/service';
import { getSettings } from '@/modules/settings/repository';
import type { Journey } from '@/modules/journeys';
import { deleteJourney, getActiveJourney, getJourney } from '@/modules/journeys/repository';
import {
  activateJourney,
  closeInterruptedJourney,
  finishJourney,
  interruptJourney,
  pauseJourney,
  prepareJourney,
  restoreJourney,
  resumeJourney,
} from '@/modules/journeys/service';
import { WATCHDOG } from './watchdog';

import { clearRuntime } from './engine';
import { isTrackingActive, startTracking, stopTracking } from './service';
import { publishJourneyStatus } from './state';

export class JourneyStartBlockedError extends Error {
  constructor(readonly issues: ReadinessIssue[]) {
    super('A journey needs location permissions and location services.');
    this.name = 'JourneyStartBlockedError';
  }
}

async function policyFor(journey: Journey) {
  const db = await getDatabase();
  const [settings, battery] = await Promise.all([getSettings(db), readBattery()]);
  return {
    batteryPct: battery.levelPct,
    policy: selectPolicy({
      distanceM: journey.lastKnownDistanceM,
      batteryLevelPct: battery.levelPct,
      batterySaver: settings.battery_saver,
      stationaryMs: 0,
    }),
  };
}

async function assertReady(): Promise<void> {
  const issues = await getReadinessIssues();
  const blocking = issues.filter((issue) => issue.severity === 'blocking');
  if (blocking.length > 0) throw new JourneyStartBlockedError(blocking);
}

/** Creates the `prepared` row when the alarm-setup sheet opens (Phase 7 task 5). */
export async function prepareJourneySession(
  destination: Destination,
  radiusM: number,
  earlierRadiusM: number | null,
): Promise<Journey> {
  const db = await getDatabase();
  const alertRules =
    earlierRadiusM !== null && earlierRadiusM > radiusM
      ? [
          { radiusM: earlierRadiusM, stageIndex: 0 },
          { radiusM, stageIndex: 1 },
        ]
      : [{ radiusM, stageIndex: 0 }];

  return prepareJourney(db, {
    placeId: destination.placeId ?? null,
    destinationName: destination.name,
    destinationLatitude: destination.latitude,
    destinationLongitude: destination.longitude,
    radiusM,
    alertRules,
  });
}

export async function startJourneySession(journeyId: string): Promise<Journey> {
  const db = await getDatabase();
  const journey = await getJourney(db, journeyId);
  if (!journey) throw new Error('Journey not found.');

  await assertReady();
  const { batteryPct, policy } = await policyFor(journey);

  await activateJourney(db, journey.id, { batteryPct });
  await startTracking(policy);
  publishJourneyStatus('active');

  const started = await getJourney(db, journey.id);
  if (!started) throw new Error('Journey disappeared while starting.');
  return started;
}

export async function pauseJourneySession(journeyId: string): Promise<void> {
  const db = await getDatabase();
  await pauseJourney(db, journeyId);
  await stopTracking();
  publishJourneyStatus('paused');
}

export async function resumeJourneySession(journeyId: string): Promise<void> {
  const db = await getDatabase();
  const journey = await getJourney(db, journeyId);
  if (!journey) return;

  // An interrupted journey is over, not paused: finish it instead of trying
  // again to track a trip whose fixes were already lost (D2).
  if (journey.status === 'interrupted') {
    await finishInterruptedJourneySession(journeyId);
    return;
  }

  await assertReady();
  const { policy } = await policyFor(journey);
  await resumeJourney(db, journeyId);
  await startTracking(policy);
  publishJourneyStatus('active');
}

/**
 * Finishes an interrupted journey: tracking and any alarm presentation are torn
 * down, the live status drops to idle and the record is closed where it stopped.
 * Nothing here retries the journey.
 */
export async function finishInterruptedJourneySession(
  journeyId: string,
): Promise<Journey | null> {
  const db = await getDatabase();
  const journey = await getJourney(db, journeyId);
  if (!journey) return null;
  if (journey.status !== 'interrupted') return journey;

  await stopTracking();
  await dismissAlarmPresentation();
  clearRuntime(journeyId);
  publishJourneyStatus('idle');

  return (await closeInterruptedJourney(db, journeyId)) ?? journey;
}

export async function endJourneySession(
  journeyId: string,
  outcome: 'completed' | 'cancelled' = 'completed',
): Promise<Journey | null> {
  const db = await getDatabase();
  const battery = await readBattery();

  await stopTracking();
  await dismissAlarmPresentation();

  const journey = await finishJourney(db, journeyId, outcome, { batteryPct: battery.levelPct });
  clearRuntime(journeyId);
  publishJourneyStatus('idle');
  return journey;
}

/**
 * Drops a setup draft. Nothing travelled, so the row is deleted rather than
 * recorded as a cancelled journey; alert rules go with it via ON DELETE CASCADE.
 */
export async function cancelPreparedJourney(journeyId: string): Promise<void> {
  const db = await getDatabase();
  const journey = await getJourney(db, journeyId);
  if (!journey || journey.status !== 'prepared') return;
  await deleteJourney(db, journeyId);
}

export interface BootstrapResult {
  journey: Journey | null;
  interrupted: boolean;
}

/**
 * Runs once on launch. Automatic restart is never promised (D2): a journey that
 * outlived its trust window becomes `interrupted` and is finished, never resumed.
 */
export async function bootstrapJourneySession(): Promise<BootstrapResult> {
  const db = await getDatabase();
  const result = await restoreJourney(db);

  if (!result.journey) {
    publishJourneyStatus('idle');
    return result;
  }

  if (result.journey.status === 'paused') {
    publishJourneyStatus('paused');
  } else if (result.journey.status === 'triggered') {
    publishJourneyStatus('triggered');
  } else if (result.interrupted) {
    // Tracking was lost before launch: finish the trip rather than prompt a
    // resume that would only lose the fix again.
    await finishInterruptedJourneySession(result.journey.id);
  } else {
    publishJourneyStatus('active');
    if (!(await isTrackingActive())) {
      const { policy } = await policyFor(result.journey);
      await startTracking(policy).catch(() => undefined);
    }
  }

  return result;
}

/**
 * Watchdog tick, called while Home or the journey screen is visible. It never
 * claims tracking beyond D14's limits: an abandoned journey is interrupted and
 * finished on the spot instead of being retried.
 */
export async function refreshJourneySession(): Promise<Journey | null> {
  const db = await getDatabase();
  const journey = await getActiveJourney(db);

  if (!journey) {
    publishJourneyStatus('idle');
    return null;
  }

  if (journey.status !== 'paused') {
    const reference = journey.lastLocationAt ?? journey.startedAt;
    if (reference !== null && Date.now() - reference >= WATCHDOG.interruptedMs) {
      await interruptJourney(db, journey.id, 'stale_gps');
      return finishInterruptedJourneySession(journey.id);
    }
  }

  publishJourneyStatus(journey.status);
  return journey;
}
