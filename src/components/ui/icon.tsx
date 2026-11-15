import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';

import type { ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type IconName = ComponentProps<typeof Ionicons>['name'];

/**
 * One icon set for the whole app. Pass a `color` for one-off tints or a
 * `themeColor` token to follow the active theme.
 */
export function Icon({
  name,
  size = 22,
  color,
  themeColor = 'text',
}: {
  name: IconName;
  size?: number;
  color?: string;
  themeColor?: ThemeColor;
}) {
  const theme = useTheme();

  return (
    <Ionicons
      name={name}
      size={size}
      color={color ?? theme[themeColor]}
      // Ionicons are text glyphs: matching line height to the box removes the
      // Android font padding that made icons sit a couple of pixels low.
      style={{ height: size, lineHeight: size, textAlign: 'center', includeFontPadding: false }}
    />
  );
}
