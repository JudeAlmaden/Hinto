/**
 * Background location service (plan Phase 5 task 2).
 *
 * `startLocationUpdatesAsync` runs the defined task with a foreground service,
 * so tracking continues with the screen off. `killServiceOnDestroy` is false:
 * a swipe-away must not silently kill an active journey.
 */

import * as Location from 'expo-location';

import { strings } from '@/constants/strings';
import { capture } from '@/modules/diagnostics';

import { LOCATION_TASK_NAME, type AdaptivePolicy } from '.';
import { setPolicyApplier } from './engine';
import { publishProviderStatus } from './state';
import { readProviderStatus } from '@/modules/permissions/service';
import '@/modules/location/task';

const ACCURACY_MAP = {
  high: Location.Accuracy.High,
  highest: Location.Accuracy.Highest,
  bestForNavigation: Location.Accuracy.BestForNavigation,
} as const;

/** Last request actually registered with the OS, so identical policies do not restart the fix stream. */
let appliedPolicy: AdaptivePolicy | null = null;

function samePolicy(left: AdaptivePolicy, right: AdaptivePolicy): boolean {
  return (
    left.accuracy === right.accuracy &&
    left.timeIntervalMs === right.timeIntervalMs &&
    left.distanceIntervalM === right.distanceIntervalM
  );
}

function taskOptions(policy: AdaptivePolicy): Location.LocationTaskOptions {
  return {
    accuracy: ACCURACY_MAP[policy.accuracy],
    timeInterval: policy.timeIntervalMs,
    distanceInterval: policy.distanceIntervalM,
    pausesUpdatesAutomatically: false,
    foregroundService: {
      notificationTitle: strings.appName,
      notificationBody: strings.journey.tracking,
      notificationColor: '#D99A43',
      killServiceOnDestroy: false,
    },
  };
}

export async function isTrackingActive(): Promise<boolean> {
  try {
    return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME);
  } catch {
    return false;
  }
}

export async function startTracking(policy: AdaptivePolicy): Promise<void> {
  try {
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, taskOptions(policy));
    appliedPolicy = policy;
    capture('location', 'tracking_started', {
      interval: policy.timeIntervalMs,
      distance: policy.distanceIntervalM,
      accuracy: policy.accuracy,
    });
    await refreshProviderStatus();
  } catch (error) {
    capture('location', 'tracking_start_failed', {
      message: error instanceof Error ? error.message.slice(0, 160) : 'unknown',
    });
    throw error;
  }
}

export async function stopTracking(): Promise<void> {
  appliedPolicy = null;
  try {
    if (await isTrackingActive()) {
      await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
      capture('location', 'tracking_stopped');
    }
  } catch (error) {
    capture('location', 'tracking_stop_failed', {
      message: error instanceof Error ? error.message.slice(0, 160) : 'unknown',
    });
  }
}

/**
 * Replaces the OS request when the journey moves into a tighter tier.
 * The request registered at start is the far tier; without this, a bus stays
 * on that request for the whole ride.
 */
export async function applyTrackingPolicy(policy: AdaptivePolicy): Promise<void> {
  if (appliedPolicy && samePolicy(appliedPolicy, policy)) return;
  if (!(await isTrackingActive())) return;
  await startTracking(policy);
}

export async function refreshProviderStatus(): Promise<void> {
  const status = await readProviderStatus();
  publishProviderStatus(status.gpsAvailable, status.networkAvailable);
}

export async function currentLocation(): Promise<Location.LocationObject | null> {
  try {
    return await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
  } catch {
    try {
      const last = await Location.getLastKnownPositionAsync({ maxAge: 300_000 });
      return last;
    } catch {
      return null;
    }
  }
}

setPolicyApplier(applyTrackingPolicy);
