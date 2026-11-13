import type { Destination } from '@/modules/places';

/** Route params for `/journey/new`; every value is a string, as Router expects. */
export function journeySetupParams(destination: Destination, radiusM: number) {
  return {
    name: destination.name,
    latitude: destination.latitude.toFixed(6),
    longitude: destination.longitude.toFixed(6),
    radius: String(Math.round(radiusM)),
    placeId: destination.placeId ?? '',
  };
}
