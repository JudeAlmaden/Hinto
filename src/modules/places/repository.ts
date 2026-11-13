/**
 * Places repository (spec §10, plan Phase 2). Returns domain objects, never raw
 * rows; every write is parameterised.
 */

import { MAX_RADIUS_M, MIN_RADIUS_M, isRadiusValid } from '@/constants/alarms';
import { createId } from '@/db/id';
import type { SqlDatabase, SqlValue } from '@/db/types';

import { type NewPlace, PLACE_CATEGORIES, type Place, type PlaceCategory } from '.';

const PLACE_COLUMNS =
  'id, name, category, latitude, longitude, icon, color, default_radius_m, is_favorite, created_at, updated_at';

interface PlaceRow {
  id: string;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  icon: string | null;
  color: string | null;
  default_radius_m: number;
  is_favorite: number;
  created_at: number;
  updated_at: number;
}

export function mapPlaceRow(row: PlaceRow): Place {
  return {
    id: row.id,
    name: row.name,
    category: row.category as PlaceCategory,
    latitude: row.latitude,
    longitude: row.longitude,
    icon: row.icon,
    color: row.color,
    defaultRadiusM: row.default_radius_m,
    isFavorite: row.is_favorite === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

interface PlaceValidationInput {
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  defaultRadiusM: number;
}

/** Shared by create and update; messages are developer-facing, not UI copy. */
export function assertValidPlace(input: PlaceValidationInput): void {
  if (!input.name.trim()) {
    throw new Error('A place needs a name.');
  }
  if (!PLACE_CATEGORIES.includes(input.category as PlaceCategory)) {
    throw new Error(`Unknown place category "${input.category}".`);
  }
  if (!Number.isFinite(input.latitude) || input.latitude < -90 || input.latitude > 90) {
    throw new Error('Latitude must be between -90 and 90.');
  }
  if (!Number.isFinite(input.longitude) || input.longitude < -180 || input.longitude > 180) {
    throw new Error('Longitude must be between -180 and 180.');
  }
  if (!isRadiusValid(input.defaultRadiusM)) {
    throw new Error(`Radius must be between ${MIN_RADIUS_M} m and ${MAX_RADIUS_M} m.`);
  }
}

/** Favourites first, then alphabetical. */
export async function listPlaces(db: SqlDatabase): Promise<Place[]> {
  const rows = await db.getAllAsync<PlaceRow>(
    `SELECT ${PLACE_COLUMNS} FROM places
     ORDER BY is_favorite DESC, name COLLATE NOCASE ASC`,
  );
  return rows.map(mapPlaceRow);
}

/** Case-insensitive name filter; `%` and `_` are literal. */
export async function searchPlaces(db: SqlDatabase, query: string): Promise<Place[]> {
  const trimmed = query.trim();
  if (!trimmed) return listPlaces(db);
  const pattern = `%${trimmed.replace(/[\\%_]/g, (match) => `\\${match}`)}%`;
  const rows = await db.getAllAsync<PlaceRow>(
    `SELECT ${PLACE_COLUMNS} FROM places
     WHERE name LIKE ? ESCAPE '\\'
     ORDER BY is_favorite DESC, name COLLATE NOCASE ASC`,
    pattern,
  );
  return rows.map(mapPlaceRow);
}

export async function getPlace(db: SqlDatabase, id: string): Promise<Place | null> {
  const row = await db.getFirstAsync<PlaceRow>(
    `SELECT ${PLACE_COLUMNS} FROM places WHERE id = ?`,
    id,
  );
  return row ? mapPlaceRow(row) : null;
}

export async function countPlaces(db: SqlDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM places');
  return row?.count ?? 0;
}

export async function createPlace(db: SqlDatabase, input: NewPlace): Promise<Place> {
  assertValidPlace(input);
  const now = Date.now();
  const place: Place = {
    ...input,
    name: input.name.trim(),
    id: createId(),
    createdAt: now,
    updatedAt: now,
  };

  await db.runAsync(
    `INSERT INTO places (${PLACE_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    place.id,
    place.name,
    place.category,
    place.latitude,
    place.longitude,
    place.icon,
    place.color,
    place.defaultRadiusM,
    place.isFavorite ? 1 : 0,
    place.createdAt,
    place.updatedAt,
  );

  return place;
}

const UPDATABLE_COLUMNS: Record<keyof NewPlace, string> = {
  name: 'name',
  category: 'category',
  latitude: 'latitude',
  longitude: 'longitude',
  icon: 'icon',
  color: 'color',
  defaultRadiusM: 'default_radius_m',
  isFavorite: 'is_favorite',
};

/** Partial update; validates the merged entity so a patch cannot corrupt a row. */
export async function updatePlace(
  db: SqlDatabase,
  id: string,
  patch: Partial<NewPlace>,
): Promise<Place | null> {
  const current = await getPlace(db, id);
  if (!current) return null;

  const merged: Place = { ...current, ...patch, updatedAt: Date.now() };
  if (patch.name !== undefined) merged.name = patch.name.trim();
  assertValidPlace(merged);

  const assignments: string[] = [];
  const params: SqlValue[] = [];
  for (const key of Object.keys(UPDATABLE_COLUMNS) as (keyof NewPlace)[]) {
    if (patch[key] === undefined) continue;
    assignments.push(`${UPDATABLE_COLUMNS[key]} = ?`);

    if (key === 'isFavorite') {
      params.push(merged.isFavorite ? 1 : 0);
    } else if (key === 'name') {
      params.push(merged.name);
    } else {
      params.push(patch[key] as SqlValue);
    }
  }

  if (assignments.length === 0) return current;

  assignments.push('updated_at = ?');
  params.push(merged.updatedAt, id);

  await db.runAsync(`UPDATE places SET ${assignments.join(', ')} WHERE id = ?`, ...params);
  return getPlace(db, id);
}

export async function setPlaceFavorite(
  db: SqlDatabase,
  id: string,
  isFavorite: boolean,
): Promise<void> {
  await updatePlace(db, id, { isFavorite });
}

export async function deletePlace(db: SqlDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM places WHERE id = ?', id);
}
