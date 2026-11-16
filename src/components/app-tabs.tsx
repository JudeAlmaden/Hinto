import * as Haptics from 'expo-haptics';
import { Tabs } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Icon, type IconName } from '@/components/ui/icon';
import { strings } from '@/constants/strings';
import { FontFamilies, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const TAB_ICONS: Record<string, { active: IconName; inactive: IconName }> = {
  index: { active: 'home', inactive: 'home-outline' },
  places: { active: 'location', inactive: 'location-outline' },
  history: { active: 'time', inactive: 'time-outline' },
  settings: { active: 'settings', inactive: 'settings-outline' },
};

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
        styles.bar,
        {
          backgroundColor: theme.backgroundElement,
          borderTopColor: theme.border,
          paddingBottom: Math.max(insets.bottom, Spacing.half),
        },
      ]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const options = descriptors[route.key].options;
        const icons = TAB_ICONS[route.name] ?? { active: 'ellipse', inactive: 'ellipse-outline' };

        const onPress = () => {
          void Haptics.selectionAsync();

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
            style={({ pressed }) => [styles.item, { opacity: pressed ? 0.65 : 1 }]}>
            <View style={styles.iconWrap}>
              <Icon
                name={focused ? icons.active : icons.inactive}
                size={22}
                color={focused ? theme.accent : theme.textSecondary}
              />
            </View>
            <ThemedText
              numberOfLines={1}
              style={[
                styles.label,
                {
                  color: focused ? theme.accent : theme.textSecondary,
                  fontWeight: focused ? '700' : '500',
                },
              ]}>
              {options.title}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

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
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 8,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 2,
    minHeight: 46,
  },
  iconWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 24,
  },
  label: {
    fontSize: 10,
    fontFamily: FontFamilies.medium,
    letterSpacing: 0.15,
    marginTop: 2,
  },
});
