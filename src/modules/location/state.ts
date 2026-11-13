/**
 * In-memory tracking state shared by the background task, the location
 * service and the UI.
 *
 * The database stays the source of truth for journeys; this only keeps the
 * live snapshot so a screen can show "updated 4s ago" without a query. The
 * snapshot object is cached between changes because `useSyncExternalStore`
 * compares snapshots by identity.
 */

import type { LocationSample } from '@/modules/geofence';
import type { JourneyStatus } from '@/modules/journeys';

import type { TrackingSnapshot } from '.';
import { deriveTrackingStatus } from './watchdog';

let lastSample: LocationSample | null = null;
let lastDistanceM: number | null = null;
let journeyStatus: JourneyStatus | 'idle' = 'idle';
let gpsAvailable: boolean | null = null;
let networkAvailable: boolean | null = null;
let restrictionSuspected = false;
let cached: TrackingSnapshot | null = null;

const listeners = new Set<() => void>();

function invalidate(): void {
  cached = null;
  for (const listener of listeners) listener();
}

export function subscribeTracking(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function publishSample(sample: LocationSample, distanceM: number | null): void {
  lastSample = sample;
  lastDistanceM = distanceM ?? lastDistanceM;
  invalidate();
}

export function publishJourneyStatus(status: JourneyStatus | 'idle'): void {
  if (journeyStatus === status) return;
  journeyStatus = status;
  invalidate();
}

export function publishProviderStatus(gps: boolean | null, network: boolean | null): void {
  gpsAvailable = gps;
  networkAvailable = network;
  invalidate();
}

export function publishRestrictionSuspected(value: boolean): void {
  if (restrictionSuspected === value) return;
  restrictionSuspected = value;
  invalidate();
}

export function resetTrackingState(): void {
  lastSample = null;
  lastDistanceM = null;
  journeyStatus = 'idle';
  invalidate();
}

export function getTrackingSnapshot(): TrackingSnapshot {
  if (cached) return cached;

  cached = {
    status: deriveTrackingStatus({
      lastSampleAt: lastSample?.timestamp ?? null,
      now: Date.now(),
      paused: journeyStatus === 'paused',
      idle: journeyStatus === 'idle',
    }),
    lastSample,
    lastSampleAt: lastSample?.timestamp ?? null,
    lastKnownDistanceM: lastDistanceM,
    accuracyM: lastSample?.accuracyM ?? null,
    gpsAvailable,
    networkAvailable,
    restrictionSuspected,
  };
  return cached;
}

export function getJourneyStatusForTracking(): JourneyStatus | 'idle' {
  return journeyStatus;
}
