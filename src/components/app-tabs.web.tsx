import { Link, Slot, usePathname, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { strings } from '@/constants/strings';
import { MaxContentWidth, Spacing } from '@/constants/theme';

/**
 * Web-only tab shell so `expo start --web` stays usable during development
 * (plan D13). The app itself gates features to Android.
 */
export default function AppTabs() {
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      <View style={styles.slot}>
        <Slot />
      </View>

      <View style={styles.tabBarWrapper}>
        <ThemedView type="backgroundElement" style={styles.tabBar}>
          <TabLink href="/" label={strings.tabs.home} active={pathname === '/'} />
          <TabLink href="/places" label={strings.tabs.places} active={pathname === '/places'} />
          <TabLink href="/history" label={strings.tabs.history} active={pathname === '/history'} />
          <TabLink
            href="/settings"
            label={strings.tabs.settings}
            active={pathname === '/settings'}
          />
        </ThemedView>
      </View>
    </View>
  );
}

function TabLink({ href, label, active }: { href: Href; label: string; active: boolean }) {
  return (
    <Link href={href} style={styles.link}>
      <ThemedText type="small" themeColor={active ? 'text' : 'textSecondary'}>
        {label}
      </ThemedText>
    </Link>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  slot: {
    flex: 1,
  },
  tabBarWrapper: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    alignItems: 'center',
    padding: Spacing.three,
  },
  tabBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.five,
    gap: Spacing.four,
    maxWidth: MaxContentWidth,
    flexGrow: 1,
  },
  link: {
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
  },
});
