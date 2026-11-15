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
import { publishProviderStatus } from './state';
import { readProviderStatus } from '@/modules/permissions/service';
import '@/modules/location/task';

const ACCURACY_MAP = {
  balanced: Location.Accuracy.Balanced,
  high: Location.Accuracy.High,
  highest: Location.Accuracy.Highest,
  bestForNavigation: Location.Accuracy.BestForNavigation,
} as const;

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

/** Applies a new policy by asking the OS for a new request (Phase 5 task 2). */
export async function applyTrackingPolicy(policy: AdaptivePolicy): Promise<void> {
  if (!(await isTrackingActive())) return;
  await startTracking(policy);
}

export async function refreshProviderStatus(): Promise<void> {
  const status = await readProviderStatus();
  publishProviderStatus(status.gpsAvailable, status.networkAvailable);
}

export async function currentLocation(): Promise<Location.LocationObject | null> {
  try {
    return await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
  } catch {
    const last = await Location.getLastKnownPositionAsync({ maxAge: 300_000 });
    return last;
  }
}
