/**
 * Trigger state machine (plan Phase 4).
 *
 * One call per location sample. It never touches storage, the network or a map;
 * the caller persists what it returns. Rules, in order:
 *
 * 1. ignore samples older than the D14 freshness window;
 * 2. fire only "confidently inside" a stage (50 m accuracy gate, error bound
 *    inside the radius);
 * 3. fire each stage at most once, choosing the innermost satisfied stage so a
 *    rider who crosses both radii between two samples still gets the urgent one;
 * 4. notice a stop passed between samples by testing the segment between the
 *    last two trustworthy fixes, and label that result an estimate.
 */

import { ACCURACY_TRUST_M, isConfidentlyInside, isSampleTrustworthy } from '@/constants/alarms';

import { distanceToSegmentMeters, haversineMeters } from './distance';
import type {
  GeoPoint,
  LocationSample,
  TriggerDecision,
  TriggerStage,
  TriggerState,
} from './index';

export const TRIGGER_RULES = {
  /** A re-entry must clear this much beyond a radius before it can fire again. */
  hysteresisM: 25,
  /** An overshoot segment must not span more than this multiple of the policy. */
  overshootIntervalFactor: 3,
} as const;

/** Widest radius first; ties keep the lower stage index. */
export function sortStagesWidestFirst(stages: readonly TriggerStage[]): TriggerStage[] {
  return [...stages].sort((a, b) => b.radiusM - a.radiusM || a.stageIndex - b.stageIndex);
}

export interface TriggerInput {
  sample: LocationSample;
  destination: GeoPoint;
  /** `journeys.radius_m`: the radius that defines "entered the radius". */
  primaryRadiusM: number;
  stages: readonly TriggerStage[];
  /** Current adaptive policy interval, from `policy.ts`. */
  timeIntervalMs: number;
  state: TriggerState;
  /** Wall clock in ms, used only for freshness and `entered_radius_at`. */
  now: number;
}

function unchanged(
  state: TriggerState,
  patch: { stale?: boolean; accuracyRejected?: boolean } = {},
): TriggerDecision {
  return {
    state,
    fireStage: null,
    distanceM: state.lastDistanceM,
    enteredRadius: false,
    stale: patch.stale ?? false,
    accuracyRejected: patch.accuracyRejected ?? false,
    estimateOnly: false,
  };
}

export function evaluateTrigger(input: TriggerInput): TriggerDecision {
  const { sample, state, now } = input;

  if (!Number.isFinite(sample.latitude) || !Number.isFinite(sample.longitude)) {
    return unchanged(state, { accuracyRejected: true });
  }

  if (!isSampleTrustworthy(sample.timestamp, now, input.timeIntervalMs)) {
    return unchanged(state, { stale: true });
  }

  const distanceM = haversineMeters(sample, input.destination);
  const stages = sortStagesWidestFirst(input.stages);
  const accuracyOk = sample.accuracyM <= ACCURACY_TRUST_M;

  const satisfied = stages.filter(
    (stage) =>
      !state.firedStages.includes(stage.stageIndex) &&
      isConfidentlyInside(distanceM, sample.accuracyM, stage.radiusM),
  );
  const enteredPrimary = isConfidentlyInside(distanceM, sample.accuracyM, input.primaryRadiusM);

  const baseState: TriggerState = {
    ...state,
    lastTrustworthySampleAt: sample.timestamp,
    lastDistanceM: distanceM,
    lastSample: sample,
    enteredRadiusAt: state.enteredRadiusAt ?? (enteredPrimary ? now : null),
  };
  const enteredRadius = state.enteredRadiusAt === null && enteredPrimary;

  if (satisfied.length > 0) {
    // Innermost satisfied stage is the most urgent one.
    const chosen = satisfied[satisfied.length - 1];
    const firedStages = Array.from(
      new Set([...state.firedStages, ...satisfied.map((stage) => stage.stageIndex)]),
    );

    return {
      state: { ...baseState, firedStages, armed: false },
      fireStage: chosen,
      distanceM,
      enteredRadius,
      stale: false,
      accuracyRejected: false,
      estimateOnly: false,
    };
  }

  // Overshoot: the stop was crossed between two trustworthy fixes. Only possible
  // with an accurate fix and a sensible gap between samples.
  if (accuracyOk && state.lastSample) {
    const previous = state.lastSample;
    const gapOk =
      sample.timestamp >= previous.timestamp &&
      sample.timestamp - previous.timestamp <=
        Math.max(
          TRIGGER_RULES.overshootIntervalFactor * input.timeIntervalMs,
          60_000,
        );

    if (gapOk) {
      const crossed = stages.filter(
        (stage) =>
          !state.firedStages.includes(stage.stageIndex) &&
          distanceToSegmentMeters(previous, sample, input.destination) <= stage.radiusM,
      );

      if (crossed.length > 0) {
        const chosen = crossed[crossed.length - 1];
        const firedStages = Array.from(
          new Set([...state.firedStages, ...crossed.map((stage) => stage.stageIndex)]),
        );

        return {
          state: { ...baseState, firedStages, armed: false },
          fireStage: chosen,
          distanceM,
          enteredRadius,
          stale: false,
          accuracyRejected: false,
          estimateOnly: true,
        };
      }
    }
  }

  // Re-arm once the device is confidently outside every stage plus hysteresis,
  // so jitter around a boundary cannot re-fire a stage that already rang.
  const outerRadius = stages.length > 0 ? stages[0].radiusM : input.primaryRadiusM;
  const comfortablyOutside =
    accuracyOk &&
    distanceM > outerRadius + TRIGGER_RULES.hysteresisM &&
    !isConfidentlyInside(distanceM, sample.accuracyM, outerRadius);

  return {
    state: { ...baseState, armed: comfortablyOutside ? true : state.armed },
    fireStage: null,
    distanceM,
    enteredRadius,
    stale: false,
    accuracyRejected: !accuracyOk && distanceM <= input.primaryRadiusM + sample.accuracyM,
    estimateOnly: false,
  };
}
