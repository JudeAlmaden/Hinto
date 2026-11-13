/** Visual progress toward the alert radius (never a promise of arrival). */
export function progressToRadius(distanceM: number | null | undefined, radiusM: number): number {
  if (distanceM === null || distanceM === undefined || !Number.isFinite(distanceM)) return 0;
  if (distanceM <= radiusM) return 1;

  // Full at the radius, empty at ten radii away, so the bar moves on any trip.
  const span = Math.max(radiusM * 9, 1000);
  return Math.max(0, Math.min(1, 1 - (distanceM - radiusM) / span));
}
