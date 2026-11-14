/**
 * Duplicate guard for saved places: the same name within a few metres is almost
 * always an accidental second save of the same spot.
 */

import { haversineMeters } from '@/modules/geofence/distance';

import type { Place } from '.';

export const DUPLICATE_RADIUS_M = 50;

export interface PlaceDraft {
  name: string;
  latitude: number;
  longitude: number;
}

export function findNearbyDuplicate(
  places: readonly Place[],
  draft: PlaceDraft,
  excludeId?: string,
): Place | null {
  const name = draft.name.trim().toLowerCase();
  if (!name) return null;

  return (
    places.find((place) => {
      if (place.id === excludeId) return false;
      if (place.name.trim().toLowerCase() !== name) return false;
      return (
        haversineMeters(
          { latitude: draft.latitude, longitude: draft.longitude },
          { latitude: place.latitude, longitude: place.longitude },
        ) <= DUPLICATE_RADIUS_M
      );
    }) ?? null
  );
}
