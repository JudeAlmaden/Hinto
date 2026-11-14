/**
 * Alarm and tracking constants — the single source of truth for values used by
 * the UI, validation and the geofence engine.
 *
 * Plan references: radius presets (Phase 0 task 7), validation bounds
 * (Phase 2), freshness + accuracy gate (D14).
 */

/** Preset radii in metres, widest first. Order is the display order. */
export const RADIUS_PRESETS_M = [5000, 3000, 1000, 500] as const;

export const DEFAULT_RADIUS_M = 1000;
export const MIN_RADIUS_M = 100;
export const MAX_RADIUS_M = 20_000;

/**
 * A fix must be this accurate to be used for an overshoot (segment-crossing)
 * estimate (D14). Normal triggering only needs the worst case to be inside the
 * radius, so a 100 m urban fix can still alert from 5 km away.
 */
export const ACCURACY_TRUST_M = 50;

/**
 * Freshness thresholds (D14). A sample is trustworthy while
 * `age <= max(FRESHNESS.trustFactor * timeInterval, FRESHNESS.minTrustMs)`.
 */
export const FRESHNESS = {
  trustFactor: 2,
  minTrustMs: 45_000,
  waitingMs: 60_000,
  staleMs: 180_000,
  interruptedMs: 600_000,
} as const;

/** Alarm repeats for at most this long before falling back to the notification (D1). */
export const ALARM_LOOP_CEILING_MS = 180_000;

export function isRadiusValid(radiusM: number): boolean {
  return Number.isFinite(radiusM) && radiusM >= MIN_RADIUS_M && radiusM <= MAX_RADIUS_M;
}

export function isSampleTrustworthy(sampleTimestamp: number, now: number, timeIntervalMs: number): boolean {
  const maxAge = Math.max(FRESHNESS.trustFactor * timeIntervalMs, FRESHNESS.minTrustMs);
  return now - sampleTimestamp <= maxAge;
}

/**
 * "Confidently inside": even the worst-case position (distance + accuracy) is
 * inside the radius. Capping accuracy outright would silently disable alerts on
 * phones reporting 100 m fixes, which is common indoors and in cities.
 */
export function isConfidentlyInside(distanceM: number, accuracyM: number, radiusM: number): boolean {
  return distanceM + accuracyM <= radiusM;
}
