/**
 * Layout utilities (.agents/Design.md §4). Tailwind-like spacing props on top of the
 * design tokens, so a screen can say `gap="three" p="four"` instead of repeating
 * a StyleSheet entry for every stack, row and card interior.
 *
 * These are intentionally small: spacing, direction, alignment, background and
 * radius. Anything component-specific still belongs in that component's own
 * style, and every value still comes from `Spacing` / `Radii` / the palette.
 */

import { Pressable, StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { Radii, Spacing, type ThemeColor } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type SpaceKey = keyof typeof Spacing;
type RadiusKey = keyof typeof Radii;

/** Either a token key (`'three'`) or a raw dp value (`16`). */
export type Space = SpaceKey | number;
export type Radius = RadiusKey | number;

const spaceValue = (value: Space | undefined): number | undefined => {
  if (value === undefined) return undefined;
  return typeof value === 'number' ? value : Spacing[value];
};

const radiusValue = (value: Radius | undefined): number | undefined => {
  if (value === undefined) return undefined;
  return typeof value === 'number' ? value : Radii[value];
};

export interface BoxProps extends ViewProps {
  /** Padding on every side. */
  p?: Space;
  /** Horizontal padding (left + right). */
  px?: Space;
  /** Vertical padding (top + bottom). */
  py?: Space;
  pt?: Space;
  pb?: Space;
  pl?: Space;
  pr?: Space;
  /** Space between children. */
  gap?: Space;
  /** Lay children out in a row instead of a column. */
  row?: boolean;
  /** Centre children on both axes. */
  center?: boolean;
  /** Push children to opposite ends of the main axis. */
  between?: boolean;
  wrap?: boolean;
  align?: ViewStyle['alignItems'];
  justify?: ViewStyle['justifyContent'];
  /** `true` for `flex: 1`, or an explicit grow factor. */
  flex?: boolean | number;
  /** Palette key or a literal colour. */
  bg?: ThemeColor | string;
  border?: boolean;
  borderColor?: ThemeColor | string;
  rounded?: Radius;
  /** Makes the box pressable and dims it while pressed. */
  onPress?: () => void;
  style?: ViewStyle | ViewStyle[];
}

export function Box({
  p,
  px,
  py,
  pt,
  pb,
  pl,
  pr,
  gap,
  row = false,
  center = false,
  between = false,
  wrap = false,
  align,
  justify,
  flex,
  bg,
  border = false,
  borderColor,
  rounded,
  onPress,
  style,
  children,
  ...rest
}: BoxProps) {
  const theme = useTheme();

  const resolveColor = (value: ThemeColor | string | undefined): string | undefined => {
    if (value === undefined) return undefined;
    return value in theme ? theme[value as ThemeColor] : value;
  };

  const layoutStyle = {
    flexDirection: (row ? 'row' : 'column') as ViewStyle['flexDirection'],
    gap: spaceValue(gap),
    padding: spaceValue(p),
    paddingHorizontal: spaceValue(px),
    paddingVertical: spaceValue(py),
    paddingTop: spaceValue(pt),
    paddingBottom: spaceValue(pb),
    paddingLeft: spaceValue(pl),
    paddingRight: spaceValue(pr),
    alignItems: center ? ('center' as const) : align,
    justifyContent: center ? ('center' as const) : between ? ('space-between' as const) : justify,
    flexWrap: wrap ? ('wrap' as const) : undefined,
    flex: flex === true ? 1 : typeof flex === 'number' ? flex : undefined,
    backgroundColor: resolveColor(bg),
    borderRadius: radiusValue(rounded),
    borderWidth: border ? StyleSheet.hairlineWidth * 2 : undefined,
    borderColor: border ? resolveColor(borderColor ?? 'border') : undefined,
  } satisfies ViewStyle;

  if (onPress) {
    return (
      <Pressable
        {...rest}
        onPress={onPress}
        style={({ pressed }) => [layoutStyle, style, pressed ? { opacity: 0.6 } : null]}>
        {children}
      </Pressable>
    );
  }

  return (
    <View
      {...rest}
      style={[
        {
          flexDirection: row ? 'row' : 'column',
          gap: spaceValue(gap),
          padding: spaceValue(p),
          paddingHorizontal: spaceValue(px),
          paddingVertical: spaceValue(py),
          paddingTop: spaceValue(pt),
          paddingBottom: spaceValue(pb),
          paddingLeft: spaceValue(pl),
          paddingRight: spaceValue(pr),
          alignItems: center ? 'center' : align,
          justifyContent: center ? 'center' : between ? 'space-between' : justify,
          flexWrap: wrap ? 'wrap' : undefined,
          flex: flex === true ? 1 : typeof flex === 'number' ? flex : undefined,
          backgroundColor: resolveColor(bg),
          borderRadius: radiusValue(rounded),
          borderWidth: border ? StyleSheet.hairlineWidth * 2 : undefined,
          borderColor: border ? resolveColor(borderColor ?? 'border') : undefined,
        },
        style,
      ]}>
      {children}
    </View>
  );
}

/** Vertical stack; the default container for a form or a section. */
export function Stack(props: Omit<BoxProps, 'row'>) {
  return <Box {...props} />;
}

/** Horizontal row, vertically centred unless overridden. */
export function Row({ align = 'center', ...props }: Omit<BoxProps, 'row'>) {
  return <Box row align={align} {...props} />;
}

/** Empty flexible space inside a Row. */
export function Spacer({ flex = 1 }: { flex?: number }) {
  return <View style={{ flex }} />;
}
