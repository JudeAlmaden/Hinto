import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { confirmAction } from '@/components/ui/confirm';
import { AppButton, Chip, TextField, ToggleRow } from '@/components/ui/controls';
import { RadiusPicker } from '@/components/ui/radius-picker';
import { DEFAULT_RADIUS_M } from '@/constants/alarms';
import { formatCopy, strings } from '@/constants/strings';
import { Radii, Spacing } from '@/constants/theme';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { isValidLatitude, isValidLongitude } from '@/modules/geofence/distance';
import { currentLocation } from '@/modules/location/service';
import type { Place, PlaceCategory } from '@/modules/places';
import { PLACE_CATEGORIES } from '@/modules/places';
import { findNearbyDuplicate } from '@/modules/places/duplicates';
import { PLACE_ICONS, defaultIconFor } from '@/modules/places/icons';
import { usePlacesStore } from '@/modules/places/store';
import { formatCoordinates, formatDistance } from '@/utils/format';

export function PlaceForm({
  initial,
  initialCoordinates,
  initialName,
  onSaved,
}: {
  initial?: Place;
  /** Seeds the coordinate fields, e.g. a pin dropped on the map. */
  initialCoordinates?: { latitude: number; longitude: number };
  /** Prefilled name from a search result or reverse geocode. */
  initialName?: string;
  onSaved: (placeId: string) => void;
}) {
  const theme = useTheme();
  const { settings } = useSettings();
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
  const [icon, setIcon] = useState(
    initial?.icon ?? defaultIconFor(initial?.category ?? 'other'),
  );
  const [iconTouched, setIconTouched] = useState(Boolean(initial?.icon));
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

  const chooseIcon = (next: string) => {
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
        color: initial?.color ?? null,
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
    const duplicate = findNearbyDuplicate(places, draft, initial?.id);
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

  return (
    <View style={styles.container}>
      <View style={styles.preview}>
        <View style={[styles.previewIcon, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText style={styles.previewGlyph}>{icon}</ThemedText>
        </View>
        <View style={styles.previewName}>
          <TextField
            label={strings.place.name}
            value={name}
            onChangeText={setName}
            placeholder={strings.place.namePlaceholder}
            autoFocus={!initial && !initialName}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {coordinatesValid
              ? formatCoordinates(parsedLatitude, parsedLongitude)
              : strings.place.location}
          </ThemedText>
        </View>
      </View>

      <View style={styles.group}>
        <ThemedText type="small" themeColor="textSecondary">
          {strings.place.tag}
        </ThemedText>
        <View style={styles.chips}>
          {PLACE_CATEGORIES.map((candidate) => (
            <Chip
              key={candidate}
              label={strings.place.categories[candidate]}
              selected={category === candidate}
              onPress={() => chooseCategory(candidate)}
            />
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <ThemedText type="small" themeColor="textSecondary">
          {strings.place.icon}
        </ThemedText>
        <View style={styles.icons}>
          {PLACE_ICONS.map((candidate) => (
            <Pressable
              key={candidate}
              accessibilityRole="button"
              accessibilityState={{ selected: candidate === icon }}
              onPress={() => chooseIcon(candidate)}
              style={[
                styles.iconChoice,
                {
                  backgroundColor: theme.backgroundElement,
                  borderColor: candidate === icon ? theme.accent : 'transparent',
                },
              ]}>
              <ThemedText style={styles.iconGlyph}>{candidate}</ThemedText>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.group}>
        <ThemedText type="small" themeColor="textSecondary">
          {strings.place.defaultRadius}
        </ThemedText>
        <RadiusPicker value={radiusM} onChange={setRadiusM} unit={settings.distance_unit} />
        <ThemedText type="small" themeColor="textSecondary">
          {formatCopy(strings.place.radiusHelp, {
            distance: formatDistance(radiusM, settings.distance_unit),
          })}
        </ThemedText>
      </View>

      <ToggleRow
        label={strings.place.favourite}
        value={favourite}
        onValueChange={setFavourite}
        last
      />

      <View style={styles.group}>
        <AppButton
          label={
            showCoordinates
              ? strings.place.hideCoordinates
              : strings.place.advancedCoordinates
          }
          variant="ghost"
          onPress={() => setShowCoordinates((value) => !value)}
        />

        {showCoordinates ? (
          <>
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
          </>
        ) : null}
      </View>

      {error ? (
        <ThemedText type="small" style={[styles.error, { color: theme.danger }]}>
          {error}
        </ThemedText>
      ) : null}

      <AppButton
        label={strings.place.save}
        onPress={save}
        disabled={saving || !canSave}
        loading={saving}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  preview: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.three,
  },
  previewIcon: {
    width: 58,
    height: 58,
    borderRadius: Radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewGlyph: {
    fontSize: 30,
  },
  previewName: {
    flex: 1,
    gap: Spacing.one,
  },
  group: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  icons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  iconChoice: {
    width: 48,
    height: 48,
    borderRadius: Radii.medium,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconGlyph: {
    fontSize: 24,
  },
  coordinates: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  coordinateField: {
    flex: 1,
  },
  error: {
    fontSize: 14,
  },
});
