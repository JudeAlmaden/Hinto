/**
 * Journey lifecycle (plan Phase 7 task 1).
 *
 * Every transition is persisted before the UI reacts. Terminal states are
 * defined once here:
 *   completed   — user pressed "I'm awake / End"
 *   cancelled   — abandoned before any alert
 *   interrupted — system/boot/unclean exit
 */

import { WATCHDOG } from '@/modules/location/watchdog';
import { capture } from '@/modules/diagnostics';
import type { SqlDatabase } from '@/db/types';

import type { Journey } from '.';
import {
  createJourney,
  getActiveJourney,
  getJourney,
  listAlertRules,
  updateJourney,
  type NewJourney,
} from './repository';

export type JourneyOutcome = 'completed' | 'cancelled' | 'interrupted';

export async function prepareJourney(db: SqlDatabase, input: NewJourney): Promise<Journey> {
  const journey = await createJourney(db, input);
  capture('journey', 'journey_prepared', { radius: journey.radiusM, stages: input.alertRules?.length ?? 1 });
  return journey;
}

export async function activateJourney(
  db: SqlDatabase,
  id: string,
  options: { batteryPct: number | null; now?: number },
): Promise<void> {
  const now = options.now ?? Date.now();
  await updateJourney(db, id, {
    status: 'active',
    startedAt: now,
    startBatteryPct: options.batteryPct,
  });
  capture('journey', 'journey_started', { battery: options.batteryPct });
}

export async function pauseJourney(db: SqlDatabase, id: string): Promise<void> {
  await updateJourney(db, id, { status: 'paused' });
  capture('journey', 'journey_paused');
}

export async function resumeJourney(db: SqlDatabase, id: string): Promise<void> {
  await updateJourney(db, id, { status: 'active' });
  capture('journey', 'journey_resumed');
}

export async function markJourneyTriggered(
  db: SqlDatabase,
  id: string,
  now = Date.now(),
): Promise<void> {
  const journey = await getJourney(db, id);
  if (!journey || journey.triggeredAt !== null) return;
  await updateJourney(db, id, { status: 'triggered', triggeredAt: now });
}

/** Ends a journey and records the metrics inputs D9 needs. */
export async function finishJourney(
  db: SqlDatabase,
  id: string,
  outcome: Extract<JourneyOutcome, 'completed' | 'cancelled'>,
  options: { batteryPct?: number | null; now?: number } = {},
): Promise<Journey | null> {
  const journey = await getJourney(db, id);
  if (!journey) return null;

  const now = options.now ?? Date.now();
  await updateJourney(db, id, {
    status: outcome,
    endedAt: now,
    endBatteryPct: options.batteryPct ?? null,
  });
  capture('journey', outcome === 'completed' ? 'journey_ended' : 'journey_cancelled', {
    duration: journey.startedAt === null ? null : Math.round((now - journey.startedAt) / 1000),
    triggered: journey.triggeredAt !== null,
  });

  return getJourney(db, id);
}

export async function interruptJourney(
  db: SqlDatabase,
  id: string,
  reason: 'stale_gps' | 'unclean_exit' | 'boot',
  now = Date.now(),
): Promise<void> {
  await updateJourney(db, id, { status: 'interrupted', endedAt: now });
  capture('journey', 'journey_interrupted', { reason });
}

/**
 * Closes an interrupted journey. An interruption is an ending, never a pause:
 * the trip keeps its honest `interrupted` outcome and is never reopened.
 */
export async function closeInterruptedJourney(
  db: SqlDatabase,
  id: string,
  now = Date.now(),
): Promise<Journey | null> {
  const journey = await getJourney(db, id);
  if (!journey) return null;
  if (journey.status !== 'interrupted') return journey;

  if (journey.endedAt === null) {
    await updateJourney(db, id, { endedAt: now });
    capture('journey', 'journey_closed', { outcome: 'interrupted' });
  }
  return getJourney(db, id);
}

/**
 * Finds the journey to show on launch. An `active` journey whose last sample is
 * older than D14's limit (or that never sampled within the same limit) is
 * reported honestly as `interrupted` instead of pretending to track (D2/D10).
 */
export async function restoreJourney(
  db: SqlDatabase,
  now = Date.now(),
): Promise<{ journey: Journey | null; interrupted: boolean }> {
  const journey = await getActiveJourney(db);
  if (!journey) return { journey: null, interrupted: false };
  if (journey.status === 'paused') return { journey, interrupted: false };

  const reference = journey.lastLocationAt ?? journey.startedAt;
  if (reference !== null && now - reference >= WATCHDOG.interruptedMs) {
    await interruptJourney(db, journey.id, 'stale_gps', now);
    const interrupted = await getJourney(db, journey.id);
    return { journey: interrupted, interrupted: true };
  }

  return { journey, interrupted: false };
}

export interface JourneyDetail {
  journey: Journey;
  stagesM: number[];
}

export async function loadJourneyDetail(
  db: SqlDatabase,
  id: string,
): Promise<JourneyDetail | null> {
  const journey = await getJourney(db, id);
  if (!journey) return null;
  const rules = await listAlertRules(db, id);
  return {
    journey,
    stagesM: rules.length > 0 ? rules.map((rule) => rule.radiusM) : [journey.radiusM],
  };
}
