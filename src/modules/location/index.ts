/**
 * Location — background tracking, freshness and recovery (plan Phase 5).
 */

import type { LocationSample } from '@/modules/geofence';

/** UI-facing tracking state. Never report `tracking` without fresh samples (D14). */
export type TrackingStatus = 'idle' | 'tracking' | 'waiting' | 'stale' | 'paused';

export const LOCATION_TASK_NAME = 'hinto-location-updates';

export interface TrackingSnapshot {
  status: TrackingStatus;
  lastSample: LocationSample | null;
  lastSampleAt: number | null;
  /** Metres, last trustworthy value only. */
  lastKnownDistanceM: number | null;
  accuracyM: number | null;
  gpsAvailable: boolean | null;
  networkAvailable: boolean | null;
  /** D7 heuristic: this phone appears to be delaying location updates. */
  restrictionSuspected: boolean;
}

export interface AdaptivePolicy {
  /**
   * `high` and above map to Android's high-accuracy fused request, which powers
   * the GPS radio. `balanced` is intentionally absent: it is allowed to use
   * cell and Wi-Fi only, so a moving bus gets no fixes until another app
   * (such as Maps) turns GPS on.
   */
  accuracy: 'high' | 'highest' | 'bestForNavigation';
  timeIntervalMs: number;
  distanceIntervalM: number;
}
