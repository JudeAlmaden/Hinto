/**
 * Design tokens (Desig.md).
 *
 * Warm Daylight in light mode and a matching warm-night palette in dark mode,
 * so the app reads as the same product whichever scheme the phone uses. Every
 * colour lives here; screens must not hard-code hex values.
 */

import '@/global.css';

import { Platform, type TextStyle } from 'react-native';

export const Colors = {
  light: {
    text: '#2F4152',
    background: '#FAF7F0',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#EAE5DA',
    textSecondary: '#6E8490',
    accent: '#D99A43',
    accentText: '#2B1B06',
    accentSoft: '#F7ECD9',
    accentBorder: '#E8D5B4',
    danger: '#C0503B',
    warning: '#9A5B00',
    success: '#3F7F6B',
    border: '#E4DED2',
  },
  dark: {
    text: '#F4EFE6',
    background: '#0E141E',
    backgroundElement: '#18202C',
    backgroundSelected: '#232D3D',
    textSecondary: '#A7B2C2',
    accent: '#F0B45C',
    accentText: '#241708',
    accentSoft: '#2A2213',
    accentBorder: '#4A3A1E',
    danger: '#FF7A5E',
    warning: '#F3B24A',
    success: '#7FD1B9',
    border: '#2B3648',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Loaded in `src/app/_layout.tsx`; keep in sync with the `useFonts` map. */
/** Soft tints for saved-place icon tiles; null keeps the neutral surface. */
export const PlaceColors = [
  '#F6D9B0',
  '#CFE5DD',
  '#F3C9BF',
  '#D8DEEC',
  '#EDE3D2',
] as const;

export const FontFamilies = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

export function fontFamilyForWeight(weight: TextStyle['fontWeight'] | undefined): string {
  switch (String(weight ?? '400')) {
    case '500':
      return FontFamilies.medium;
    case '600':
      return FontFamilies.semibold;
    case '700':
    case 'bold':
      return FontFamilies.bold;
    case '800':
    case '900':
      return FontFamilies.extrabold;
    default:
      return FontFamilies.regular;
  }
}

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

/** 4-point scale from Desig.md §4. */
export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const Radii = {
  small: 8,
  medium: 12,
  large: 18,
  pill: 999,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 50 }) ?? 0;
export const MaxContentWidth = 800;
