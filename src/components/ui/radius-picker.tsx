import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Chip, TextField } from '@/components/ui/controls';
import { strings } from '@/constants/strings';
import { MAX_RADIUS_M, MIN_RADIUS_M, RADIUS_PRESETS_M } from '@/constants/alarms';
import { Spacing } from '@/constants/theme';
import { formatRadius } from '@/utils/format';

const PRESETS: number[] = [...RADIUS_PRESETS_M];

/**
 * Preset chips plus a custom metre field (plan Phase 2, wireframes §4.5).
 * The bounds come from `constants/alarms.ts`; no screen repeats them.
 */
export function RadiusPicker({
  value,
  onChange,
  unit = 'km',
}: {
  value: number;
  onChange: (radiusM: number) => void;
  unit?: 'km' | 'mi';
}) {
  const isPreset = PRESETS.includes(value);
  const [customOpen, setCustomOpen] = useState(!isPreset);
  const [draft, setDraft] = useState(String(value));

  const commit = (text: string) => {
    setDraft(text);
    const parsed = Number.parseInt(text.replace(/[^0-9]/g, ''), 10);
    if (Number.isFinite(parsed) && parsed >= MIN_RADIUS_M && parsed <= MAX_RADIUS_M) {
      onChange(parsed);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.chips}>
        {PRESETS.map((preset) => (
          <Chip
            key={preset}
            label={formatRadius(preset, unit)}
            selected={!customOpen && value === preset}
            onPress={() => {
              setCustomOpen(false);
              setDraft(String(preset));
              onChange(preset);
            }}
          />
        ))}
        <Chip
          label={strings.journeySetup.custom}
          selected={customOpen}
          onPress={() => {
            setCustomOpen(true);
            setDraft(String(value));
          }}
        />
      </View>

      {customOpen ? (
        <View style={styles.customRow}>
          <TextField
            value={draft}
            onChangeText={commit}
            keyboardType="number-pad"
            label={strings.journeySetup.metres}
            hint={`${MIN_RADIUS_M}–${MAX_RADIUS_M} m`}
          />
        </View>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          {formatRadius(value, unit)}
        </ThemedText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.two,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  customRow: {
    gap: Spacing.two,
  },
});
