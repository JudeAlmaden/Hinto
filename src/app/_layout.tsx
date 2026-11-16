import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  DarkTheme,
  DefaultTheme,
  Stack,
  ThemeProvider,
  usePathname,
  useRootNavigationState,
  useRouter,
} from 'expo-router';
import * as Notifications from 'expo-notifications';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef } from 'react';
import { Platform, StyleSheet } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ErrorBoundary } from '@/components/error-boundary';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ONBOARDING_VERSION } from '@/constants/app';
import { strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { getDatabase, openDatabase } from '@/db/client';
import { ALARM_ACTION_STOP_ID, ensureNotificationChannels } from '@/modules/alarm/channels';
import { dismissAlarmPresentation, subscribeToAlarm } from '@/modules/alarm/delivery';
import {
  configureNotificationHandler,
  extractAlarmJourneyId,
} from '@/modules/alarm/notifications';
import { markSessionStart } from '@/modules/diagnostics';
import { bootstrapJourneySession, endJourneySession } from '@/modules/location/session';
import { useResolvedScheme } from '@/hooks/use-appearance';
import { useAppearance } from '@/modules/settings/appearance';
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
  const colorScheme = useResolvedScheme();
  const router = useRouter();
  const navigationState = useRootNavigationState();
  const navigationKey = navigationState?.key;
  // The notification tap, the cold-start response and the live alarm event can
  // all fire for the same alert, and a snooze re-fires the same journey minutes
  // later. Both are handled here: never stack two alarm screens, and never push
  // a second one on top of the screen that is already ringing.
  const lastAlarmRoute = useRef<{ key: string; at: number } | null>(null);
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);

  useEffect(() => {
    pathnameRef.current = pathname;
  }, [pathname]);

  const openAlarm = useCallback(
    (journeyId: string | null) => {
      // The mounted alarm screen already follows the alarm state; pushing again
      // would leave a duplicate behind the one on screen.
      if (pathnameRef.current === '/alarm') return;

      const key = `journey:${journeyId ?? 'none'}`;
      const now = Date.now();
      const previous = lastAlarmRoute.current;
      if (previous && previous.key === key && now - previous.at < 5000) return;
      lastAlarmRoute.current = { key, at: now };
      router.push(journeyId ? { pathname: '/alarm', params: { journeyId } } : '/alarm');
    },
    [router],
  );

  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    markSessionStart();

    // The animated overlay hides the splash on native; web has no overlay.
    if (Platform.OS === 'web') {
      SplashScreen.hideAsync().catch(() => undefined);
      return;
    }

    configureNotificationHandler();

    const handleNotificationResponse = (response: Notifications.NotificationResponse) => {
      const journeyId = extractAlarmJourneyId(response);
      if (response.actionIdentifier === ALARM_ACTION_STOP_ID) {
        if (journeyId) {
          void endJourneySession(journeyId, 'completed').catch(() => undefined);
        } else {
          void dismissAlarmPresentation().catch(() => undefined);
        }
        return;
      }
      if (journeyId) openAlarm(journeyId);
    };

    // A tap on the alarm notification or its action buttons must be handled honestly.
    const subscription = Notifications.addNotificationResponseReceivedListener(handleNotificationResponse);

    void Notifications.getLastNotificationResponseAsync()
      .then((response) => {
        if (response) handleNotificationResponse(response);
      })
      .catch(() => undefined);

    // When alarm triggers while app is open, navigate directly to alarm screen
    const alarmSubscription = subscribeToAlarm((active) => {
      if (active) openAlarm(active.journeyId);
    });

    return () => {
      subscription.remove();
      alarmSubscription();
    };
  }, [openAlarm, router]);

  useEffect(() => {
    if (Platform.OS === 'web' || !navigationKey) return;
    let cancelled = false;

    void (async () => {
      try {
        // Opens, migrates and health-checks storage once for the whole process (D6).
        await openDatabase();
        await ensureNotificationChannels();
        const settings = await getSettings(await getDatabase());
        useAppearance.getState().setPreference(settings.appearance);
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

  // Keep the native splash up until the type is ready; a missing font must
  // never block the app, so an error falls through to the system face.
  if (!fontsLoaded && !fontError) return null;

  return (
    <ErrorBoundary>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        {Platform.OS === 'web' ? (
          <WebNotice />
        ) : (
          <>
            <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
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
