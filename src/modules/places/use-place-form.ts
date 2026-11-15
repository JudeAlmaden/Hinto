import { useEffect, useState } from 'react';

import { strings, formatCopy } from '@/constants/strings';
import { DEFAULT_RADIUS_M } from '@/constants/alarms';
import { confirmAction } from '@/components/ui/confirm';
import { isValidLatitude, isValidLongitude } from '@/modules/geofence/distance';
import { currentLocation } from '@/modules/location/service';
import type { Place, PlaceCategory } from '@/modules/places';
import { findNearbyDuplicate } from '@/modules/places/duplicates';
import { defaultIconFor, type PlaceIconName } from '@/modules/places/icons';
import { usePlacesStore } from '@/modules/places/store';

interface Options {
  initial?: Place;
  initialCoordinates?: { latitude: number; longitude: number };
  initialName?: string;
  onSaved: (placeId: string) => void;
}

/**
 * Everything the place form needs except rendering: draft state, validation,
 * the create-only duplicate guard and persistence.
 */
export function usePlaceForm({ initial, initialCoordinates, initialName, onSaved }: Options) {
  const places = usePlacesStore((state) => state.places);
  const loadPlaces = usePlacesStore((state) => state.load);
  const createPlace = usePlacesStore((state) => state.create);
  const updatePlace = usePlacesStore((state) => state.update);

  useEffect(() => {
    // The duplicate guard needs the existing places even when this screen is
    // the first thing opened in the process.
    void loadPlaces();
  }, [loadPlaces]);

  const seededLatitude = initial?.latitude ?? initialCoordinates?.latitude;
  const seededLongitude = initial?.longitude ?? initialCoordinates?.longitude;

  const [name, setName] = useState(initial?.name ?? initialName ?? '');
  const [category, setCategory] = useState<PlaceCategory>(initial?.category ?? 'other');
  const [icon, setIcon] = useState(initial?.icon ?? defaultIconFor(initial?.category ?? 'other'));
  const [iconTouched, setIconTouched] = useState(Boolean(initial?.icon));
  const [color, setColor] = useState<string | null>(initial?.color ?? null);
  const [latitude, setLatitude] = useState(
    seededLatitude === undefined ? '' : String(seededLatitude),
  );
  const [longitude, setLongitude] = useState(
    seededLongitude === undefined ? '' : String(seededLongitude),
  );
  const [radiusM, setRadiusM] = useState(initial?.defaultRadiusM ?? DEFAULT_RADIUS_M);
  const [favourite, setFavourite] = useState(initial?.isFavorite ?? false);
  const [showCoordinates, setShowCoordinates] = useState(Boolean(initial));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

  // Number('') is 0, which would quietly save a place at 0,0.
  const parsedLatitude = latitude.trim() ? Number(latitude.trim()) : Number.NaN;
  const parsedLongitude = longitude.trim() ? Number(longitude.trim()) : Number.NaN;
  const coordinatesValid =
    isValidLatitude(parsedLatitude) && isValidLongitude(parsedLongitude);
  const canSave = name.trim().length > 0 && coordinatesValid;

  const chooseCategory = (next: PlaceCategory) => {
    setCategory(next);
    if (!iconTouched) setIcon(defaultIconFor(next));
  };

  const chooseIcon = (next: PlaceIconName) => {
    setIcon(next);
    setIconTouched(true);
  };

  const fillFromDevice = async () => {
    setLocating(true);
    try {
      const position = await currentLocation();
      if (!position) {
        setError(strings.journey.waitingForFix);
        return;
      }
      setLatitude(position.coords.latitude.toFixed(6));
      setLongitude(position.coords.longitude.toFixed(6));
      setShowCoordinates(true);
      setError(null);
    } finally {
      setLocating(false);
    }
  };

  const persist = async (draft: { name: string; latitude: number; longitude: number }) => {
    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: draft.name,
        category,
        latitude: draft.latitude,
        longitude: draft.longitude,
        icon,
        color,
        defaultRadiusM: radiusM,
        isFavorite: favourite,
      };

      if (initial) {
        await updatePlace(initial.id, payload);
        onSaved(initial.id);
      } else {
        const created = await createPlace(payload);
        onSaved(created.id);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : strings.common.errorBody);
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    if (!name.trim()) {
      setError(strings.place.nameRequired);
      return;
    }
    if (!coordinatesValid) {
      setError(strings.destination.invalidCoordinates);
      setShowCoordinates(true);
      return;
    }

    const draft = { name: name.trim(), latitude: parsedLatitude, longitude: parsedLongitude };

    // Editing an existing place is a deliberate act; only creating a new one
    // needs the near-duplicate nudge.
    const duplicate = initial ? null : findNearbyDuplicate(places, draft);
    if (duplicate) {
      confirmAction({
        title: formatCopy(strings.place.duplicateTitle, { name: duplicate.name }),
        body: strings.place.duplicateBody,
        confirmLabel: strings.place.duplicateConfirm,
        onConfirm: () => void persist(draft),
      });
      return;
    }

    void persist(draft);
  };

  return {
    name,
    setName,
    category,
    chooseCategory,
    icon,
    chooseIcon,
    color,
    setColor,
    radiusM,
    setRadiusM,
    favourite,
    setFavourite,
    latitude,
    setLatitude,
    longitude,
    setLongitude,
    parsedLatitude,
    parsedLongitude,
    coordinatesValid,
    showCoordinates,
    toggleCoordinates: () => setShowCoordinates((value) => !value),
    locating,
    fillFromDevice,
    error,
    saving,
    canSave,
    save,
  };
}
