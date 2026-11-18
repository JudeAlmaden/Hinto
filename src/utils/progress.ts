/**
 * Visual progress toward the alert radius (never a promise of arrival).
 *
 * Measured from where this journey actually started — the first trustworthy
 * sample — to the alert radius, so a trip that begins far away fills as the
 * rider closes in instead of sitting empty until the final radius.
 *
 * 0 = no closer than at the start, 1 = at (or inside) the radius.
 */
export function journeyProgress(
  distanceM: number | null | undefined,
  startDistanceM: number | null | undefined,
  radiusM: number,
): number {
  if (distanceM === null || distanceM === undefined || !Number.isFinite(distanceM)) return 0;
  if (distanceM <= radiusM) return 1;
  if (
    startDistanceM === null ||
    startDistanceM === undefined ||
    !Number.isFinite(startDistanceM) ||
    startDistanceM <= radiusM
  ) {
    // No usable starting point yet (no fix, or started inside the radius).
    // Stay empty rather than inventing a scale.
    return 0;
  }

  return Math.max(0, Math.min(1, (startDistanceM - distanceM) / (startDistanceM - radiusM)));
}
