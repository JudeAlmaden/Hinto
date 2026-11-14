/**
 * Removes the places that early debug builds seeded automatically. They were
 * Metro Manila fixtures, not the user's places, and looked like real data.
 */

import type { SqlDatabase } from './types';

interface Fixture {
  name: string;
  latitude: number;
  longitude: number;
}

/** Exact coordinates of the old `DEV_PLACES`; matching is deliberately tight. */
export const LEGACY_DEV_FIXTURES: readonly Fixture[] = [
  { name: 'Home', latitude: 14.5995, longitude: 120.9842 },
  { name: 'Work', latitude: 14.5547, longitude: 121.0244 },
  { name: 'Terminal', latitude: 14.5086, longitude: 121.0194 },
];

export function isLegacyDevFixture(place: Fixture): boolean {
  return LEGACY_DEV_FIXTURES.some(
    (fixture) =>
      fixture.name === place.name &&
      Math.abs(fixture.latitude - place.latitude) < 1e-9 &&
      Math.abs(fixture.longitude - place.longitude) < 1e-9,
  );
}

/** Returns how many fixture rows were deleted (zero on every later boot). */
export async function removeLegacyDevelopmentFixtures(db: SqlDatabase): Promise<number> {
  const rows = await db.getAllAsync<Fixture & { id: string }>(
    'SELECT id, name, latitude, longitude FROM places',
  );
  const stale = rows.filter((row) => isLegacyDevFixture(row));

  for (const row of stale) {
    await db.runAsync('DELETE FROM places WHERE id = ?', row.id);
  }

  return stale.length;
}
