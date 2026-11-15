import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/ui/icon';
import { PlaceColors } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export function ColorSwatches({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (color: string | null) => void;
}) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ selected: value === null }}
        onPress={() => onChange(null)}
        style={[
          styles.swatch,
          {
            backgroundColor: theme.backgroundSelected,
            borderColor: value === null ? theme.accent : 'transparent',
          },
        ]}>
        <Icon name="ban-outline" size={16} themeColor="textSecondary" />
      </Pressable>
      {PlaceColors.map((candidate) => (
        <Pressable
          key={candidate}
          accessibilityRole="button"
          accessibilityState={{ selected: value === candidate }}
          onPress={() => onChange(candidate)}
          style={[
            styles.swatch,
            {
              backgroundColor: candidate,
              borderColor: value === candidate ? theme.accent : 'transparent',
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
