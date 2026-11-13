/**
 * Battery-restriction heuristic (plan D7).
 *
 * Pure and unit-tested so the claim "this phone is delaying location updates"
 * is evidence-based. It never guesses from manufacturer, battery level or
 * signal strength — only from gaps between consecutive samples.
 */

export const BATTERY_HEURISTIC = {
  /** A gap must exceed this multiple of the expected interval… */
  gapFactor: 3,
  /** …and at least this long, so a slow policy cannot trip it. */
  minGapMs: 300_000,
  /** Two gap events inside this rolling window are needed. */
  windowMs: 900_000,
  minGapEvents: 2,
} as const;

export function gapThresholdMs(expectedIntervalMs: number): number {
  return Math.max(BATTERY_HEURISTIC.gapFactor * expectedIntervalMs, BATTERY_HEURISTIC.minGapMs);
}

/** Sample timestamps where the interval since the previous sample was too long. */
export function findGapEvents(
  timestamps: readonly number[],
  expectedIntervalMs: number,
): number[] {
  const threshold = gapThresholdMs(expectedIntervalMs);
  const events: number[] = [];
  for (let index = 1; index < timestamps.length; index += 1) {
    const gap = timestamps[index] - timestamps[index - 1];
    if (gap > threshold) events.push(timestamps[index]);
  }
  return events;
}

export interface RestrictionInput {
  timestamps: readonly number[];
  expectedIntervalMs: number;
  /** The watchdog's "now", so the rolling window is testable. */
  now: number;
  journeyActive: boolean;
  locationPermissionGranted: boolean;
}

/**
 * Restriction is suspected only while a journey is active and permission is
 * granted: an app that may not read location must report permission loss, never
 * an OEM restriction (D7).
 */
export function isRestrictionSuspected(input: RestrictionInput): boolean {
  if (!input.journeyActive || !input.locationPermissionGranted) return false;

  const windowStart = input.now - BATTERY_HEURISTIC.windowMs;
  const recentGaps = findGapEvents(input.timestamps, input.expectedIntervalMs).filter(
    (timestamp) => timestamp >= windowStart,
  );
  return recentGaps.length >= BATTERY_HEURISTIC.minGapEvents;
}
