import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton, Chip, TextField, ToggleRow } from '@/components/ui/controls';
import { RadiusPicker } from '@/components/ui/radius-picker';
import { strings } from '@/constants/strings';
import { DEFAULT_RADIUS_M } from '@/constants/alarms';
import { Spacing } from '@/constants/theme';
import { isValidLatitude, isValidLongitude } from '@/modules/geofence/distance';
import type { Place, PlaceCategory } from '@/modules/places';
import { PLACE_CATEGORIES } from '@/modules/places';
import { usePlacesStore } from '@/modules/places/store';
import { currentLocation } from '@/modules/location/service';

export function PlaceForm({
  initial,
  initialCoordinates,
  onSaved,
}: {
  initial?: Place;
  /** Seeds the coordinate fields, e.g. a pin dropped on the map. */
  initialCoordinates?: { latitude: number; longitude: number };
  onSaved: () => void;
}) {
  const createPlace = usePlacesStore((state) => state.create);
  const updatePlace = usePlacesStore((state) => state.update);

  const seededLatitude = initial?.latitude ?? initialCoordinates?.latitude;
  const seededLongitude = initial?.longitude ?? initialCoordinates?.longitude;

  const [name, setName] = useState(initial?.name ?? '');
  const [category, setCategory] = useState<PlaceCategory>(initial?.category ?? 'other');
  const [latitude, setLatitude] = useState(
    seededLatitude === undefined ? '' : String(seededLatitude),
  );
  const [longitude, setLongitude] = useState(
    seededLongitude === undefined ? '' : String(seededLongitude),
  );
  const [radiusM, setRadiusM] = useState(initial?.defaultRadiusM ?? DEFAULT_RADIUS_M);
  const [favourite, setFavourite] = useState(initial?.isFavorite ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);

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
      setError(null);
    } finally {
      setLocating(false);
    }
  };

  const save = async () => {
    const parsedLat = Number(latitude.trim());
    const parsedLng = Number(longitude.trim());

    if (!name.trim()) {
      setError(strings.place.name);
      return;
    }
    if (!isValidLatitude(parsedLat) || !isValidLongitude(parsedLng)) {
      setError(strings.destination.invalidCoordinates);
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        name: name.trim(),
        category,
        latitude: parsedLat,
        longitude: parsedLng,
        icon: initial?.icon ?? null,
        color: initial?.color ?? null,
        defaultRadiusM: radiusM,
        isFavorite: favourite,
      };

      if (initial) {
        await updatePlace(initial.id, payload);
      } else {
        await createPlace(payload);
      }
      onSaved();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : strings.common.errorBody);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      <TextField
        label={strings.place.name}
        value={name}
        onChangeText={setName}
        placeholder={strings.place.namePlaceholder}
        autoFocus={!initial}
      />

      <View style={styles.group}>
        <ThemedText type="small" themeColor="textSecondary">
          {strings.place.category}
        </ThemedText>
        <View style={styles.chips}>
          {PLACE_CATEGORIES.map((candidate) => (
            <Chip
              key={candidate}
              label={strings.place.categories[candidate]}
              selected={category === candidate}
              onPress={() => setCategory(candidate)}
            />
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <ThemedText type="small" themeColor="textSecondary">
          {strings.place.location}
        </ThemedText>
        <View style={styles.coordinates}>
          <View style={styles.coordinateField}>
            <TextField
              label={strings.destination.latitude}
              value={latitude}
              onChangeText={setLatitude}
              keyboardType="numbers-and-punctuation"
              autoCorrect={false}
            />
          </View>
          <View style={styles.coordinateField}>
            <TextField
              label={strings.destination.longitude}
              value={longitude}
              onChangeText={setLongitude}
              keyboardType="numbers-and-punctuation"
              autoCorrect={false}
            />
          </View>
        </View>
        <AppButton
          label={locating ? strings.common.loading : strings.place.useCurrentLocation}
          variant="secondary"
          onPress={() => void fillFromDevice()}
          loading={locating}
        />
      </View>

      <View style={styles.group}>
        <ThemedText type="small" themeColor="textSecondary">
          {strings.place.defaultRadius}
        </ThemedText>
        <RadiusPicker value={radiusM} onChange={setRadiusM} />
      </View>

      <ToggleRow
        label={strings.place.favourite}
        value={favourite}
        onValueChange={setFavourite}
        last
      />

      {error ? (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}

      <AppButton
        label={strings.place.save}
        onPress={() => void save()}
        disabled={saving}
        loading={saving}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  group: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  coordinates: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  coordinateField: {
    flex: 1,
  },
  error: {
    color: '#E5484D',
  },
});
