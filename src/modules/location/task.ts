/**
 * Background location task (plan Phase 5 task 1).
 *
 * `defineTask` must run at module scope (SDK 58 requirement), so this file is
 * imported by the root layout as well as the location service. The task body
 * only opens the shared database and hands the samples to the engine.
 */

import type { LocationObject } from 'expo-location';
import * as TaskManager from 'expo-task-manager';

import { getDatabase } from '@/db/client';
import { capture } from '@/modules/diagnostics';

import { LOCATION_TASK_NAME } from '.';
import { processLocationSamples } from './engine';

async function handleTask(data: unknown, error: unknown): Promise<void> {
  if (error) {
    capture('location', 'task_error', { message: String(error).slice(0, 160) });
    return;
  }

  const locations = (data as { locations?: LocationObject[] } | undefined)?.locations ?? [];
  if (locations.length === 0) return;

  try {
    const db = await getDatabase();
    await processLocationSamples(
      db,
      locations.map((location) => ({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        accuracyM: location.coords.accuracy ?? 9999,
        timestamp: location.timestamp,
      })),
    );
  } catch (taskError) {
    capture('location', 'task_failed', {
      message: taskError instanceof Error ? taskError.message.slice(0, 160) : 'unknown',
    });
  }
}

try {
  if (!TaskManager.isTaskDefined(LOCATION_TASK_NAME)) {
    TaskManager.defineTask(LOCATION_TASK_NAME, ({ data, error }) => handleTask(data, error));
  }
} catch {
  // Web and any platform without the task manager simply has no background task.
}
