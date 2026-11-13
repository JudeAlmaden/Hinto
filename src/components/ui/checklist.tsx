import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/controls';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ChecklistState = 'ok' | 'warning' | 'blocking';

export interface ChecklistItem {
  key: string;
  label: string;
  state: ChecklistState;
  onPress?: () => void;
}

/** ✓ / ! / ✕ rows used by Home, onboarding and journey setup (wireframes §3). */
export function ReadinessChecklist({ items }: { items: ChecklistItem[] }) {
  const theme = useTheme();

  return (
    <Card>
      {items.map((item, index) => {
        const color =
          item.state === 'ok'
            ? theme.success
            : item.state === 'warning'
              ? theme.warning
              : theme.danger;
        const glyph = item.state === 'ok' ? '✓' : item.state === 'warning' ? '!' : '✕';

        return (
          <Pressable
            key={item.key}
            disabled={!item.onPress}
            onPress={item.onPress}
            style={[
              styles.row,
              index < items.length - 1 && {
                borderBottomColor: theme.border,
                borderBottomWidth: StyleSheet.hairlineWidth,
              },
            ]}>
            <ThemedText style={[styles.glyph, { color }]}>{glyph}</ThemedText>
            <ThemedText type="small" style={styles.label}>
              {item.label}
            </ThemedText>
            {item.onPress ? (
              <ThemedText type="small" themeColor="textSecondary">
                ›
              </ThemedText>
            ) : null}
          </Pressable>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  glyph: {
    width: 18,
    textAlign: 'center',
    fontWeight: '700',
  },
  label: {
    flex: 1,
  },
});
