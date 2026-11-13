/**
 * Geofence — distance and trigger evaluation (plan Phase 4).
 *
 * Everything here must stay pure: no SQLite, no location APIs, no network, so
 * the state machine is unit-testable and cannot break offline (D17).
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface LocationSample extends GeoPoint {
  accuracyM: number;
  /** Epoch ms from the location provider. */
  timestamp: number;
}

export interface TriggerConfig {
  destinationLatitude: number;
  destinationLongitude: number;
  /** Alert stages in metres, widest first. */
  stagesM: readonly number[];
  /** Current policy update interval, used for the freshness window. */
  timeIntervalMs: number;
}

/** A warning radius from `journey_alert_rules`; `stage_index` orders them. */
export interface TriggerStage {
  radiusM: number;
  stageIndex: number;
}

export interface TriggerState {
  /** Stage indexes already fired, to guarantee one alert per stage. */
  firedStages: number[];
  lastTrustworthySampleAt: number | null;
  enteredRadiusAt: number | null;
  /** True once the device has been confidently outside, so re-entry can re-arm. */
  armed: boolean;
  /** Previous trustworthy fix, used only for overshoot detection. */
  lastSample: LocationSample | null;
  lastDistanceM: number | null;
}

export interface TriggerDecision {
  state: TriggerState;
  /** Stage to alert for, if this sample fires one. */
  fireStage: TriggerStage | null;
  distanceM: number | null;
  /** True when the sample crossed into the radius for the first time. */
  enteredRadius: boolean;
  /** The sample was too old to be used (D14). */
  stale: boolean;
  /** The fix was not accurate enough to fire, but is still usable for distance. */
  accuracyRejected: boolean;
  /** The stage was inferred from a segment crossing, not a point inside it. */
  estimateOnly: boolean;
}

export function createTriggerState(): TriggerState {
  return {
    firedStages: [],
    lastTrustworthySampleAt: null,
    enteredRadiusAt: null,
    armed: true,
    lastSample: null,
    lastDistanceM: null,
  };
}
