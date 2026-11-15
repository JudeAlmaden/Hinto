import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton, Chip, TextField, ToggleRow } from '@/components/ui/controls';
import { ChipRow } from '@/components/ui/chip-row';
import { ColorSwatches } from '@/components/ui/color-swatches';
import { FormSection } from '@/components/ui/form-section';
import { IconGrid } from '@/components/ui/icon-grid';
import { RadiusPicker } from '@/components/ui/radius-picker';
import { formatCopy, strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import type { Place } from '@/modules/places';
import { PLACE_CATEGORIES } from '@/modules/places';
import { usePlaceForm } from '@/modules/places/use-place-form';
import { formatCoordinates, formatDistance } from '@/utils/format';

export function PlaceForm({
  initial,
  initialCoordinates,
  initialName,
  onSaved,
  secondaryAction,
}: {
  initial?: Place;
  /** Seeds the coordinate fields, e.g. a pin dropped on the map. */
  initialCoordinates?: { latitude: number; longitude: number };
  /** Prefilled name from a search result or reverse geocode. */
  initialName?: string;
  onSaved: (placeId: string) => void;
  /** Optional action paired with Save, e.g. Start journey. */
  secondaryAction?: { label: string; onPress: () => void };
}) {
  const theme = useTheme();
  const { settings } = useSettings();
  const form = usePlaceForm({ initial, initialCoordinates, initialName, onSaved });

  return (
    <View style={styles.container}>
      <TextField
        label={strings.place.name}
        value={form.name}
        onChangeText={form.setName}
        placeholder={strings.place.namePlaceholder}
        hint={
          form.coordinatesValid
            ? formatCoordinates(form.parsedLatitude, form.parsedLongitude)
            : strings.place.location
        }
        autoFocus={!initial && !initialName}
      />

      <FormSection label={strings.place.tag}>
        <ChipRow>
          {PLACE_CATEGORIES.map((candidate) => (
            <Chip
              key={candidate}
              label={strings.place.categories[candidate]}
              selected={form.category === candidate}
              onPress={() => form.chooseCategory(candidate)}
            />
          ))}
        </ChipRow>
      </FormSection>

      <FormSection label={strings.place.icon}>
        <IconGrid value={form.icon} onSelect={form.chooseIcon} />
      </FormSection>

      <FormSection label={strings.place.color}>
        <ColorSwatches value={form.color} onChange={form.setColor} />
      </FormSection>

      <FormSection label={strings.place.defaultRadius}>
        <RadiusPicker
          value={form.radiusM}
          onChange={form.setRadiusM}
          unit={settings.distance_unit}
        />
        <ThemedText type="small" themeColor="textSecondary">
          {formatCopy(strings.place.radiusHelp, {
            distance: formatDistance(form.radiusM, settings.distance_unit),
          })}
        </ThemedText>
      </FormSection>

      <ToggleRow
        label={strings.place.favourite}
        value={form.favourite}
        onValueChange={form.setFavourite}
        last
      />

      <AppButton
        label={
          form.showCoordinates
            ? strings.place.hideCoordinates
            : strings.place.advancedCoordinates
        }
        variant="ghost"
        onPress={form.toggleCoordinates}
      />

      {form.showCoordinates ? (
        <>
          <View style={styles.coordinatesHead}>
            <ThemedText type="small" themeColor="textSecondary">
              {strings.place.location}
            </ThemedText>
            <Pressable onPress={() => void form.fillFromDevice()} disabled={form.locating}>
              <ThemedText type="small" style={{ color: theme.accent }}>
                {form.locating ? strings.common.loading : strings.place.useCurrentLocation}
              </ThemedText>
            </Pressable>
          </View>
          <View style={styles.coordinates}>
            <View style={styles.coordinateField}>
              <TextField
                label={strings.destination.latitude}
                value={form.latitude}
                onChangeText={form.setLatitude}
                keyboardType="numbers-and-punctuation"
                autoCorrect={false}
              />
            </View>
            <View style={styles.coordinateField}>
              <TextField
                label={strings.destination.longitude}
                value={form.longitude}
                onChangeText={form.setLongitude}
                keyboardType="numbers-and-punctuation"
                autoCorrect={false}
              />
            </View>
          </View>
        </>
      ) : null}

      {form.error ? (
        <ThemedText type="small" style={[styles.error, { color: theme.danger }]}>
          {form.error}
        </ThemedText>
      ) : null}

      <View style={styles.actionsRow}>
        <AppButton
          label={strings.place.save}
          onPress={form.save}
          disabled={form.saving || !form.canSave}
          loading={form.saving}
          style={styles.action}
        />
        {secondaryAction ? (
          <AppButton
            label={secondaryAction.label}
            variant="secondary"
            onPress={secondaryAction.onPress}
            style={styles.action}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  coordinates: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  coordinatesHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
    flex: 1,
  },
  coordinateField: {
    flex: 1,
  },
  error: {
    fontSize: 14,
  },
});
