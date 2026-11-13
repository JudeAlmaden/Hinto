import { useEffect } from 'react';

import { usePlacesStore } from '@/modules/places/store';

export function usePlaces() {
  const places = usePlacesStore((state) => state.places);
  const loading = usePlacesStore((state) => state.loading);
  const loaded = usePlacesStore((state) => state.loaded);
  const error = usePlacesStore((state) => state.error);
  const load = usePlacesStore((state) => state.load);

  useEffect(() => {
    void load();
  }, [load]);

  return { places, loading, loaded, error, reload: () => load(true) };
}
