import { Pressable, StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
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
        const glyph =
          item.state === 'ok'
            ? ('checkmark' as const)
            : item.state === 'warning'
              ? ('alert' as const)
              : ('close' as const);

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
            <Icon name={glyph} size={18} color={color} />
            <ThemedText type="small" style={styles.label}>
              {item.label}
            </ThemedText>
            {item.onPress ? (
              <Icon name="chevron-forward" size={16} themeColor="textSecondary" />
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
