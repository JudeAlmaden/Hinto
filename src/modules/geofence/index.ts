/**
 * Geofence — distance and trigger evaluation (plan Phase 4).
 *
 * Everything here must stay pure: no SQLite, no location APIs, no network, so
 * the state machine is unit-testable and cannot break offline (D17).
 */

export interface LocationSample {
  latitude: number;
  longitude: number;
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

export interface TriggerState {
  /** Stage indexes already fired, to guarantee one alert per stage. */
  firedStages: number[];
  lastTrustworthySampleAt: number | null;
  enteredRadiusAt: number | null;
  /** True once the device has been confidently outside, so re-entry can re-arm. */
  armed: boolean;
}

export interface TriggerDecision {
  state: TriggerState;
  /** Stage to alert for, if this sample fires one. */
  fireStage: number | null;
  distanceM: number | null;
  /** True when the sample crossed into the radius for the first time. */
  enteredRadius: boolean;
}

export function createTriggerState(): TriggerState {
  return {
    firedStages: [],
    lastTrustworthySampleAt: null,
    enteredRadiusAt: null,
    armed: true,
  };
}
