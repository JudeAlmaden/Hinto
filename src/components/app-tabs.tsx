import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { strings } from '@/constants/strings';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TAB_ICONS: Record<string, { active: IconName; inactive: IconName }> = {
  index: { active: 'home', inactive: 'home-outline' },
  places: { active: 'location', inactive: 'location-outline' },
  history: { active: 'time', inactive: 'time-outline' },
  settings: { active: 'settings', inactive: 'settings-outline' },
};

/**
 * React Navigation 7 passes either `navigation` or `navigateToTab` to a custom
 * tab bar, so both are accepted here.
 */
type HintoTabBarProps = {
  state: { index: number; routes: { key: string; name: string }[] };
  descriptors: Record<string, { options: { title?: string } }>;
  navigation?: {
    emit: (event: { type: 'tabPress'; target: string; canPreventDefault: boolean }) => {
      defaultPrevented?: boolean;
    };
    navigate: (name: string) => void;
  };
  navigateToTab?: (key: string) => void;
};

function HintoTabBar({ state, descriptors, navigation, navigateToTab }: HintoTabBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrap,
        { paddingBottom: Math.max(insets.bottom, Spacing.two) },
      ]}>
      <View
        style={[
          styles.bar,
          { backgroundColor: theme.backgroundElement, borderColor: theme.border },
        ]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const options = descriptors[route.key].options;
          const icons = TAB_ICONS[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };

          const onPress = () => {
            const event = navigation?.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (focused || event?.defaultPrevented) return;
            if (navigation) navigation.navigate(route.name);
            else navigateToTab?.(route.key);
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={options.title}
              onPress={onPress}
              style={styles.item}>
              <View
                style={[
                  styles.iconSlot,
                  focused && { backgroundColor: theme.accentSoft },
                ]}>
                <Icon
                  name={focused ? icons.active : icons.inactive}
                  size={20}
                  color={focused ? theme.accent : theme.textSecondary}
                />
              </View>
              <ThemedText
                type="small"
                numberOfLines={1}
                style={[
                  styles.label,
                  { color: focused ? theme.accent : theme.textSecondary },
                  focused && styles.labelActive,
                ]}>
                {options.title}
              </ThemedText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Bottom navigation for the four MVP destinations (plan §4.1). */
export default function AppTabs() {
  return (
    <Tabs
      tabBar={(props) => <HintoTabBar {...props} />}
      screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="index" options={{ title: strings.tabs.home }} />
      <Tabs.Screen name="places" options={{ title: strings.tabs.places }} />
      <Tabs.Screen name="history" options={{ title: strings.tabs.history }} />
      <Tabs.Screen name="settings" options={{ title: strings.tabs.settings }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.five,
    // The raised tab sits above the bar; keep the whole area tappable.
    pointerEvents: 'box-none',
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.one,
    paddingVertical: Spacing.one,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: Spacing.one,
  },
  iconSlot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
  },
  labelActive: {
    fontWeight: '700',
  },
});
