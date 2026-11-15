import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export interface MoreMenuItem {
  label: string;
  icon?: IconName;
  destructive?: boolean;
  onPress: () => void;
}

/** `⋯` trigger with an anchored dropdown. Used for rare, mostly destructive actions. */
export function MoreMenu({ items, label = 'More' }: { items: MoreMenuItem[]; label?: string }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={() => setOpen(true)}
        hitSlop={12}
        style={styles.trigger}>
        <Icon name="ellipsis-horizontal" size={22} themeColor="text" />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <View
            style={[
              styles.menu,
              {
                backgroundColor: theme.backgroundElement,
                borderColor: theme.border,
                top: insets.top + 52,
              },
            ]}>
            {items.map((item) => (
              <Pressable
                key={item.label}
                accessibilityRole="button"
                onPress={() => {
                  setOpen(false);
                  item.onPress();
                }}
                style={({ pressed }) => [styles.item, pressed && { opacity: 0.6 }]}>
                {item.icon ? (
                  <Icon
                    name={item.icon}
                    size={18}
                    color={item.destructive ? theme.danger : theme.text}
                  />
                ) : null}
                <ThemedText
                  type="small"
                  style={{ color: item.destructive ? theme.danger : theme.text, fontWeight: '600' }}>
                  {item.label}
                </ThemedText>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backdrop: {
    flex: 1,
  },
  menu: {
    position: 'absolute',
    right: Spacing.three,
    minWidth: 190,
    borderRadius: Radii.medium,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.one,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
  },
});
