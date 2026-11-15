import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Android-only MVP (plan D16). iOS values are kept so the config stays valid
 * but are unvalidated — no iOS build or device test is in scope.
 *
 * Local config plugin `boot-recovery` (plan D2) is added in Phase 5 together
 * with the native module, so it is intentionally absent here.
 */
export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Hinto',
  slug: 'hinto',
  version: '0.4.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'hinto',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/expo.icon',
  },
  android: {
    package: 'com.hinto.app',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'server',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    // MapLibre Native for the keyless OpenStreetMap pin picker (plan D19).
    // Requires a development build; it is not part of Expo Go.
    '@maplibre/maplibre-react-native',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    'expo-sqlite',
    [
      'expo-audio',
      {
        // Declares the mediaPlayback foreground service needed for sustained
        // background playback of the alarm loop (plan D1).
        enableBackgroundPlayback: true,
        recordAudioAndroid: false,
      },
    ],
    [
      'expo-location',
      {
        isAndroidBackgroundLocationEnabled: true,
        isAndroidForegroundServiceEnabled: true,
        androidForegroundServiceIcon: './assets/notifications/service-icon.png',
        isIosBackgroundLocationEnabled: true,
        locationAlwaysAndWhenInUsePermission:
          'Hinto uses your location to alert you before you reach your stop, including while the screen is off.',
        locationWhenInUsePermission:
          'Hinto uses your location to measure how close you are to your destination.',
      },
    ],
    [
      'expo-notifications',
      {
        icon: './assets/notifications/notification-icon.png',
        color: '#208AEF',
        defaultChannel: 'journey-v1',
        sounds: [
          // Android resource names allow only lowercase letters, digits and
          // underscores, so the bundled sounds must not use hyphens.
          './assets/sounds/alarm_classic.wav',
          './assets/sounds/alarm_chime.wav',
          './assets/sounds/alarm_beep.wav',
        ],
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    ...config.extra,
    eas: {
      projectId: 'b5a96491-cc92-477a-97cd-f7263e5a687b',
    },
    router: {
      asyncRoutes: {
        web: true,
      },
    },
  },
  owner: 'judealmadens-team',
});
