import type { ImperativeRouter } from 'expo-router';

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

/**
 * Opens a finished journey's summary and drops the journey/alarm screens behind
 * it, so Back returns Home instead of reopening a trip that already ended.
 */
export function openJourneyResult(router: ImperativeRouter, journeyId: string) {
  if (router.canDismiss()) router.dismissAll();
  router.push({ pathname: '/history/[id]', params: { id: journeyId } });
}
