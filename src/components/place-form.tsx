import { forwardRef, useEffect, useImperativeHandle, type Ref } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton, Chip, TextField, ToggleRow } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { Row } from '@/components/ui/layout';
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

export interface PlaceFormHandle {
  save: () => void;
}

export interface PlaceFormStatus {
  canSave: boolean;
  saving: boolean;
  dirty: boolean;
}

interface PlaceFormProps {
  initial?: Place;
  /** Seeds the coordinate fields, e.g. a pin dropped on the map. */
  initialCoordinates?: { latitude: number; longitude: number };
  /** Prefilled name from a search result or reverse geocode. */
  initialName?: string;
  onSaved: (placeId: string) => void;
  /** Optional action paired with Save, e.g. Start journey. */
  secondaryAction?: { label: string; onPress: () => void };
  /** Parent renders the actions (sticky footer) instead of the form. */
  hideActions?: boolean;
  onStateChange?: (state: PlaceFormStatus) => void;
}

function PlaceFormImpl(
  { initial, initialCoordinates, initialName, onSaved, secondaryAction, hideActions, onStateChange }: PlaceFormProps,
  ref: Ref<PlaceFormHandle>,
) {
  const form = usePlaceForm({ initial, initialCoordinates, initialName, onSaved });

  useImperativeHandle(ref, () => ({ save: form.save }), [form.save]);

  useEffect(() => {
    onStateChange?.({ canSave: form.canSave, saving: form.saving, dirty: form.dirty });
  }, [form.canSave, form.saving, form.dirty, onStateChange]);

  const theme = useTheme();
  const { settings } = useSettings();

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

      <Pressable
        accessibilityRole="button"
        onPress={form.toggleCoordinates}
        style={({ pressed }) => [styles.coordsToggle, pressed && { opacity: 0.6 }]}>
        <ThemedText style={styles.coordsToggleLabel}>{strings.place.advancedCoordinates}</ThemedText>
        {form.showCoordinates ? null : (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {form.coordinatesValid
              ? formatCoordinates(form.parsedLatitude, form.parsedLongitude)
              : strings.place.location}
          </ThemedText>
        )}
        <Icon
          name={form.showCoordinates ? 'chevron-up' : 'chevron-down'}
          size={16}
          themeColor="textSecondary"
        />
      </Pressable>

      {form.showCoordinates ? (
        <>
          <Row between>
            <ThemedText type="small" themeColor="textSecondary">
              {strings.place.location}
            </ThemedText>
            <Pressable onPress={() => void form.fillFromDevice()} disabled={form.locating}>
              <ThemedText type="small" style={{ color: theme.accent }}>
                {form.locating ? strings.common.loading : strings.place.useCurrentLocation}
              </ThemedText>
            </Pressable>
          </Row>
          <Row gap="two">
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
          </Row>
        </>
      ) : null}

      {form.error ? (
        <ThemedText type="small" style={[styles.error, { color: theme.danger }]}>
          {form.error}
        </ThemedText>
      ) : null}

      {hideActions ? null : (
        <Row gap="two">
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
        </Row>
      )}
    </View>
  );
}

export const PlaceForm = forwardRef(PlaceFormImpl);

const styles = StyleSheet.create({
  container: {
    gap: Spacing.three,
  },
  coordsToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  coordsToggleLabel: {
    fontSize: 15,
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
