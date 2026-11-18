/**
 * Migration 002 — remembers where a journey actually started.
 *
 * The progress bar used to guess its scale from the alert radius alone, so a
 * trip that began 20 km away sat empty until the last few hundred metres. The
 * first trustworthy sample now records `start_distance_m` and the bar fills
 * between that distance and the radius.
 */

export const version = 2;

export const statements: readonly string[] = [
  'ALTER TABLE journeys ADD COLUMN start_distance_m REAL',
];
