import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { PLACE_ICONS, PLACE_ICON_OUTLINES, type PlaceIconName } from '@/modules/places/icons';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const COLUMNS = 4;

/**
 * Tiles are measured from the container instead of percentage widths, so every
 * square is identical and the glyph lands on an exact pixel centre.
 */
export function IconGrid({
  value,
  onSelect,
}: {
  value: string | null | undefined;
  onSelect: (icon: PlaceIconName) => void;
}) {
  const theme = useTheme();
  const [width, setWidth] = useState(0);
  const tile = width > 0 ? Math.floor((width - Spacing.two * (COLUMNS - 1)) / COLUMNS) : 0;

  return (
    <View style={styles.grid} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {tile > 0
        ? PLACE_ICONS.map((candidate) => {
            const selected = candidate === value;
            return (
              <Pressable
                key={candidate}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onSelect(candidate)}
                style={({ pressed }) => [
                  styles.tile,
                  {
                    width: tile,
                    height: tile,
                    backgroundColor: selected ? theme.accentSoft : theme.backgroundElement,
                    borderColor: selected ? theme.accent : 'transparent',
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}>
                <Icon
                  name={selected ? candidate : (PLACE_ICON_OUTLINES[candidate] as PlaceIconName)}
                  size={22}
                  color={selected ? theme.accent : theme.text}
                />
                {selected ? (
                  <View style={[styles.check, { backgroundColor: theme.accent }]}>
                    <Icon name="checkmark" size={10} color={theme.accentText} />
                  </View>
                ) : null}
              </Pressable>
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tile: {
    borderRadius: Radii.medium,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
