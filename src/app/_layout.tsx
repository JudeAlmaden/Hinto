import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Platform, StyleSheet, useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import { ErrorBoundary } from '@/components/error-boundary';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { openDatabase } from '@/db/client';
import { markSessionStart } from '@/modules/diagnostics';

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

  useEffect(() => {
    markSessionStart();
    // The animated overlay hides the splash on native; web has no overlay.
    if (Platform.OS === 'web') {
      SplashScreen.hideAsync().catch(() => undefined);
      return;
    }

    // Opens, migrates and health-checks storage once for the whole process (D6).
    // A failure surfaces through getStorageSnapshot(); it must not block boot.
    openDatabase().catch(() => undefined);
  }, []);

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
