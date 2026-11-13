import { DarkTheme, DefaultTheme, Stack, ThemeProvider, useRootNavigationState, useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, StyleSheet, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ErrorBoundary } from '@/components/error-boundary';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ONBOARDING_VERSION } from '@/constants/app';
import { strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { getDatabase, openDatabase } from '@/db/client';
import { ensureNotificationChannels } from '@/modules/alarm/channels';
import {
  configureNotificationHandler,
  extractAlarmJourneyId,
} from '@/modules/alarm/notifications';
import { markSessionStart } from '@/modules/diagnostics';
import { bootstrapJourneySession } from '@/modules/location/session';
import { getSettings } from '@/modules/settings/repository';
// Defines the background location task at module scope (SDK 58 requirement).
import '@/modules/location/task';

SplashScreen.preventAutoHideAsync();

/**
 * Web is a development convenience only (plan D13): no storage is initialised
 * and no Android-only feature is offered there.
 */
function WebNotice() {
  return (
    <ThemedView style={styles.webContainer}>
      <ThemedText type="subtitle">{strings.common.androidOnlyTitle}</ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.webBody}>
        {strings.common.androidOnlyBody}
      </ThemedText>
    </ThemedView>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const navigationKey = navigationState?.key;

  useEffect(() => {
    markSessionStart();

    // The animated overlay hides the splash on native; web has no overlay.
    if (Platform.OS === 'web') {
      SplashScreen.hideAsync().catch(() => undefined);
      return;
    }

    configureNotificationHandler();

    // A tap on the alarm notification must never silently discard the alert.
    const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
      const journeyId = extractAlarmJourneyId(response);
      router.push(journeyId ? { pathname: '/alarm', params: { journeyId } } : '/alarm');
    });

    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        const journeyId = extractAlarmJourneyId(response);
        if (journeyId) router.push({ pathname: '/alarm', params: { journeyId } });
      })
      .catch(() => undefined);

    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    if (Platform.OS === 'web' || !navigationKey) return;
    let cancelled = false;

    void (async () => {
      try {
        // Opens, migrates and health-checks storage once for the whole process (D6).
        await openDatabase();
        await ensureNotificationChannels();
        const settings = await getSettings(await getDatabase());
        // Recovery is honest: an interrupted journey is reported, not resumed (D2).
        await bootstrapJourneySession();

        if (!cancelled && settings.onboarding_version < ONBOARDING_VERSION) {
          router.replace('/onboarding/welcome');
        }
      } catch {
        // A storage failure surfaces through getStorageSnapshot(); boot must continue.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigationKey, router]);

  return (
    <ErrorBoundary>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {Platform.OS === 'web' ? (
          <WebNotice />
        ) : (
          <>
            <AnimatedSplashOverlay />
            <Stack screenOptions={{ headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="journey/new" options={{ presentation: 'modal' }} />
              <Stack.Screen name="journey/[id]/options" options={{ presentation: 'modal' }} />
              <Stack.Screen
                name="alarm"
                options={{ presentation: 'fullScreenModal', gestureEnabled: false, animation: 'fade' }}
              />
              <Stack.Screen name="alarm-test" options={{ presentation: 'modal' }} />
              <Stack.Screen name="onboarding" options={{ gestureEnabled: false }} />
            </Stack>
          </>
        )}
      </ThemeProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  webContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.five,
  },
  webBody: {
    textAlign: 'center',
  },
});
