import type { ConfigContext, ExpoConfig } from 'expo/config';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY ?? '';

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
  version: '0.0.0',
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
    config: {
      // Required by expo-maps GoogleMaps.View (plan D3). Empty when the secret
      // is not configured; the pin picker then falls back to coordinate entry.
      googleMaps: {
        apiKey: GOOGLE_MAPS_API_KEY,
      },
    },
  },
  web: {
    output: 'server',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
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
        defaultChannel: 'journey',
        sounds: [
          './assets/sounds/alarm-classic.wav',
          './assets/sounds/alarm-chime.wav',
          './assets/sounds/alarm-beep.wav',
        ],
      },
    ],
    [
      'expo-maps',
      {
        requestLocationPermission: true,
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    ...config.extra,
    router: {
      asyncRoutes: {
        web: true,
      },
    },
    eas: {
      projectId: '3c4796ed-ae8c-418a-95bf-ed92a252a0a2',
    },
  },
  owner: 'judealmadens-team',
});
