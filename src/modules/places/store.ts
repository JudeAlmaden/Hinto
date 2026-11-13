/**
 * Places cache (plan Phase 2 task 4).
 *
 * SQLite is the source of truth; this store only mirrors it for screens so a
 * list does not re-query on every focus. Every mutation goes through the
 * repository first and then refreshes the cache.
 */

import { create } from 'zustand';

import { getDatabase } from '@/db/client';

import type { NewPlace, Place } from '.';
import {
  createPlace,
  deletePlace,
  listPlaces,
  updatePlace,
} from './repository';

interface PlacesState {
  places: Place[];
  loading: boolean;
  loaded: boolean;
  error: string | null;
  load: (force?: boolean) => Promise<void>;
  create: (input: NewPlace) => Promise<Place>;
  update: (id: string, patch: Partial<NewPlace>) => Promise<void>;
  remove: (id: string) => Promise<void>;
  duplicate: (id: string) => Promise<Place | null>;
}

export const usePlacesStore = create<PlacesState>((set, get) => ({
  places: [],
  loading: false,
  loaded: false,
  error: null,

  load: async (force = false) => {
    if (get().loading) return;
    if (get().loaded && !force) return;

    set({ loading: true, error: null });
    try {
      const db = await getDatabase();
      const places = await listPlaces(db);
      set({ places, loading: false, loaded: true });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Could not load saved places.',
      });
    }
  },

  create: async (input) => {
    const db = await getDatabase();
    const place = await createPlace(db, input);
    set({ places: await listPlaces(db), loaded: true });
    return place;
  },

  update: async (id, patch) => {
    const db = await getDatabase();
    await updatePlace(db, id, patch);
    set({ places: await listPlaces(db) });
  },

  remove: async (id) => {
    const db = await getDatabase();
    await deletePlace(db, id);
    set({ places: await listPlaces(db) });
  },

  duplicate: async (id) => {
    const source = get().places.find((place) => place.id === id);
    if (!source) return null;
    const db = await getDatabase();
    const copy = await createPlace(db, {
      name: `${source.name} (copy)`,
      category: source.category,
      latitude: source.latitude,
      longitude: source.longitude,
      icon: source.icon,
      color: source.color,
      defaultRadiusM: source.defaultRadiusM,
      isFavorite: false,
    });
    set({ places: await listPlaces(db) });
    return copy;
  },
}));
