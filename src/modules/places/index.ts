/**
 * Places — saved destinations (spec §4.3, §10).
 * Repository + Zustand cache land in Phase 2.
 */

export type PlaceCategory = 'home' | 'school' | 'work' | 'terminal' | 'other';

export const PLACE_CATEGORIES: readonly PlaceCategory[] = [
  'home',
  'school',
  'work',
  'terminal',
  'other',
] as const;

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  latitude: number;
  longitude: number;
  icon: string | null;
  color: string | null;
  defaultRadiusM: number;
  isFavorite: boolean;
  createdAt: number;
  updatedAt: number;
}

export type NewPlace = Omit<Place, 'id' | 'createdAt' | 'updatedAt'>;

/** A destination chosen from search or a dropped pin, before it is saved. */
export interface Destination {
  name: string;
  latitude: number;
  longitude: number;
  placeId?: string | null;
}
