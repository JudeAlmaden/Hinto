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
  accuracy: 'balanced' | 'high' | 'highest' | 'bestForNavigation';
  timeIntervalMs: number;
  distanceIntervalM: number;
}
