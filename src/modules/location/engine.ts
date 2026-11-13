/**
 * Location engine (plan Phase 5 tasks 1, 7, 8).
 *
 * The background task calls this once per batch of samples. It is the only
 * place that turns a fix into a journey update and an alert, and it keeps every
 * decision out of the UI so the alarm cannot depend on a screen being mounted.
 */

import * as Location from 'expo-location';

import type { SqlDatabase } from '@/db/types';
import { deliverAlarm } from '@/modules/alarm/delivery';
import { isRestrictionSuspected } from '@/modules/battery/heuristics';
import { readBattery } from '@/modules/battery/service';
import { capture } from '@/modules/diagnostics';
import { createTriggerState } from '@/modules/geofence';
import type { GeoPoint, LocationSample, TriggerStage, TriggerState } from '@/modules/geofence';
import { haversineMeters } from '@/modules/geofence/distance';
import { selectPolicy } from '@/modules/geofence/policy';
import { evaluateTrigger } from '@/modules/geofence/trigger';
import type { AdaptivePolicy } from '@/modules/location';
import { getSettings } from '@/modules/settings/repository';
import {
  addJourneyAlert,
  getActiveJourney,
  listAlertRules,
  updateJourney,
} from '@/modules/journeys/repository';
import type { Journey } from '@/modules/journeys';

import { publishRestrictionSuspected, publishSample } from './state';

export interface IncomingSample {
  latitude: number;
  longitude: number;
  accuracyM: number;
  timestamp: number;
}

interface Runtime {
  trigger: TriggerState;
  policy: AdaptivePolicy;
  lastPosition: GeoPoint | null;
  lastMovementAt: number | null;
  restrictionReported: boolean;
}

const runtimes = new Map<string, Runtime>();
const sampleWindows = new Map<string, number[]>();

const MAX_WINDOW_SAMPLES = 200;
const MOVEMENT_THRESHOLD_M = 30;

function ensureRuntime(journeyId: string): Runtime {
  let runtime = runtimes.get(journeyId);
  if (!runtime) {
    runtime = {
      trigger: createTriggerState(),
      policy: selectPolicy({
        distanceM: null,
        batteryLevelPct: null,
        batterySaver: false,
        stationaryMs: 0,
      }),
      lastPosition: null,
      lastMovementAt: null,
      restrictionReported: false,
    };
    runtimes.set(journeyId, runtime);
  }
  return runtime;
}

export function getRuntime(journeyId: string): Runtime | undefined {
  return runtimes.get(journeyId);
}

export function clearRuntime(journeyId: string): void {
  runtimes.delete(journeyId);
  sampleWindows.delete(journeyId);
}

async function hasForegroundPermission(): Promise<boolean> {
  try {
    const permission = await Location.getForegroundPermissionsAsync();
    return permission.status === Location.PermissionStatus.GRANTED;
  } catch {
    return false;
  }
}

function primaryStageIndex(stages: readonly TriggerStage[]): number {
  return stages.reduce((highest, stage) => Math.max(highest, stage.stageIndex), 0);
}

async function fireAlarm(
  db: SqlDatabase,
  journey: Journey,
  stage: TriggerStage,
  decision: { distanceM: number | null; estimateOnly: boolean; accuracyM: number },
  primaryIndex: number,
  sound: string,
  snoozeMinutes: number,
  vibration: boolean,
  repeatUntilDismissed: boolean,
  now: number,
): Promise<void> {
  const distanceM = decision.distanceM ?? 0;

  const alert = await addJourneyAlert(db, {
    journeyId: journey.id,
    alertType: stage.stageIndex === primaryIndex ? 'primary' : 'earlier',
    stageIndex: stage.stageIndex,
    triggerDistanceM: distanceM,
    accuracyM: decision.accuracyM,
    triggeredAt: now,
  });

  await updateJourney(db, journey.id, {
    status: 'triggered',
    triggeredAt: journey.triggeredAt ?? now,
    lastKnownDistanceM: distanceM,
  });

  capture('trigger', 'journey_triggered', {
    stage: stage.stageIndex,
    radius: stage.radiusM,
    distance: Math.round(distanceM),
    estimate: decision.estimateOnly,
  });

  await deliverAlarm({
    journeyId: journey.id,
    alertId: alert.id,
    destinationName: journey.destinationName,
    distanceM,
    sound: sound === 'chime' || sound === 'beep' ? sound : 'classic',
    snoozeMinutes,
    vibration,
    repeatUntilDismissed,
    stageIndex: stage.stageIndex,
    estimateOnly: decision.estimateOnly,
  }).catch(() => undefined);
}

/**
 * Processes samples oldest-first. A stale sample is ignored for triggering and
 * for journey freshness (D14), so a replayed batch cannot fake progress.
 */
export async function processLocationSamples(
  db: SqlDatabase,
  samples: readonly IncomingSample[],
  now = Date.now(),
): Promise<void> {
  if (samples.length === 0) return;

  const journey = await getActiveJourney(db);
  if (!journey) return;

  const settings = await getSettings(db);
  const rules = await listAlertRules(db, journey.id);
  const stages: TriggerStage[] =
    rules.length > 0
      ? rules.map((rule) => ({ radiusM: rule.radiusM, stageIndex: rule.stageIndex }))
      : [{ radiusM: journey.radiusM, stageIndex: 0 }];
  const primaryIndex = primaryStageIndex(stages);

  const runtime = ensureRuntime(journey.id);
  const battery = await readBattery();
  const permissionGranted = await hasForegroundPermission();
  const destination: GeoPoint = {
    latitude: journey.destinationLatitude,
    longitude: journey.destinationLongitude,
  };

  const ordered = [...samples].sort((a, b) => a.timestamp - b.timestamp);

  for (const raw of ordered) {
    if (!Number.isFinite(raw.latitude) || !Number.isFinite(raw.longitude)) continue;

    const sample: LocationSample = {
      latitude: raw.latitude,
      longitude: raw.longitude,
      accuracyM: Number.isFinite(raw.accuracyM) ? Math.max(0, raw.accuracyM) : 9999,
      timestamp: raw.timestamp,
    };

    const distanceM = haversineMeters(sample, destination);
    if (
      runtime.lastPosition &&
      haversineMeters(runtime.lastPosition, sample) >= MOVEMENT_THRESHOLD_M
    ) {
      runtime.lastMovementAt = sample.timestamp;
    }
    runtime.lastPosition = sample;

    runtime.policy = selectPolicy({
      distanceM,
      batteryLevelPct: battery.levelPct,
      batterySaver: settings.battery_saver,
      stationaryMs:
        runtime.lastMovementAt === null
          ? 0
          : Math.max(0, sample.timestamp - runtime.lastMovementAt),
    });

    const decision = evaluateSafe({
      sample,
      destination,
      primaryRadiusM: journey.radiusM,
      stages,
      timeIntervalMs: runtime.policy.timeIntervalMs,
      state: runtime.trigger,
      now,
    });
    runtime.trigger = decision.state;

    if (decision.stale) {
      capture('location', 'sample_ignored_stale', {
        ageSeconds: Math.round((now - sample.timestamp) / 1000),
      });
      continue;
    }

    publishSample(sample, decision.distanceM);

    if (decision.fireStage) {
      await fireAlarm(
        db,
        journey,
        decision.fireStage,
        {
          distanceM: decision.distanceM,
          estimateOnly: decision.estimateOnly,
          accuracyM: sample.accuracyM,
        },
        primaryIndex,
        settings.alarm_sound_id,
        settings.snooze_minutes,
        settings.vibration_enabled,
        settings.repeat_until_dismissed,
        now,
      );
    }

    await updateJourney(db, journey.id, {
      lastLocationAt: sample.timestamp,
      lastKnownDistanceM: decision.distanceM,
      ...(decision.enteredRadius ? { enteredRadiusAt: now } : {}),
      ...(decision.fireStage
        ? { status: 'triggered' as const, triggeredAt: journey.triggeredAt ?? now }
        : {}),
    });
  }

  const window = sampleWindows.get(journey.id) ?? [];
  window.push(...ordered.map((sample) => sample.timestamp));
  while (window.length > MAX_WINDOW_SAMPLES) window.shift();
  sampleWindows.set(journey.id, window);

  if (
    !runtime.restrictionReported &&
    isRestrictionSuspected({
      timestamps: window,
      expectedIntervalMs: runtime.policy.timeIntervalMs,
      now,
      journeyActive: journey.status === 'active' || journey.status === 'triggered',
      locationPermissionGranted: permissionGranted,
    })
  ) {
    runtime.restrictionReported = true;
    publishRestrictionSuspected(true);
    capture('location', 'tracking_gap_suspected', {
      interval: runtime.policy.timeIntervalMs,
    });
  }
}

type TriggerInput = Parameters<typeof evaluateTrigger>[0];

function evaluateSafe(input: TriggerInput) {
  try {
    return evaluateTrigger(input);
  } catch {
    return {
      state: input.state,
      fireStage: null,
      distanceM: input.state.lastDistanceM,
      enteredRadius: false,
      stale: false,
      accuracyRejected: false,
      estimateOnly: false,
    };
  }
}
