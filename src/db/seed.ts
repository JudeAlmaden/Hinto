/**
 * Development fixtures (plan Phase 1 task 6). Never runs in release builds:
 * `seedDevelopmentData` returns immediately when `__DEV__` is false, and the
 * caller only invokes it under the same guard.
 */

import { capture } from '@/modules/diagnostics';
import type { NewPlace } from '@/modules/places';
import { countPlaces, createPlace } from '@/modules/places/repository';

import type { SqlDatabase } from './types';

/** Metro Manila coordinates, wide enough apart to test the geofence by hand. */
const DEV_PLACES: NewPlace[] = [
  {
    name: 'Home',
    category: 'home',
    latitude: 14.5995,
    longitude: 120.9842,
    icon: null,
    color: null,
    defaultRadiusM: 500,
    isFavorite: true,
  },
  {
    name: 'Work',
    category: 'work',
    latitude: 14.5547,
    longitude: 121.0244,
    icon: null,
    color: null,
    defaultRadiusM: 1000,
    isFavorite: false,
  },
  {
    name: 'Terminal',
    category: 'terminal',
    latitude: 14.5086,
    longitude: 121.0194,
    icon: null,
    color: null,
    defaultRadiusM: 1000,
    isFavorite: false,
  },
];

export async function seedDevelopmentData(db: SqlDatabase): Promise<void> {
  if (!__DEV__) return;
  if ((await countPlaces(db)) > 0) return;

  for (const place of DEV_PLACES) {
    await createPlace(db, place);
  }

  capture('db', 'db_seeded', { places: DEV_PLACES.length });
}
