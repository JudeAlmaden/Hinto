import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Row } from '@/components/ui/layout';
import { strings } from '@/constants/strings';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DistanceUnit } from '@/modules/settings/schema';
import { formatDistance } from '@/utils/format';

/** Tone follows the journey state: normal, stale, paused or ringing. */
export type RingTone = 'accent' | 'warning' | 'danger' | 'muted';

const RING_SIZE = 200;

function clampProgress(progress: number): number {
  return Math.max(0, Math.min(1, Number.isFinite(progress) ? progress : 0));
}

function toneColor(theme: ReturnType<typeof useTheme>, tone: RingTone): string {
  if (tone === 'danger') return theme.danger;
  if (tone === 'warning') return theme.warning;
  if (tone === 'muted') return theme.textSecondary;
  return theme.accent;
}

/** `19.2 km` → `{ value: '19.2', unit: 'km' }` for the split numeral. */
function splitDistance(metres: number | null, unit: DistanceUnit): { value: string; unit: string } {
  if (metres === null || !Number.isFinite(metres)) {
    return { value: '—', unit: unit === 'mi' ? 'mi' : 'km' };
  }
  const [value, symbol] = formatDistance(metres, unit).split(' ');
  return { value, unit: symbol ?? (unit === 'mi' ? 'mi' : 'km') };
}

/**
 * A tick dial drawn with plain views — no SVG/native module, so it renders on
 * any build. Used large on the Journey screen and at 64 dp on Home's card.
 */
export function ProgressDial({
  progress,
  size = 64,
  tone = 'accent',
}: {
  progress: number;
  size?: number;
  tone?: RingTone;
}) {
  const theme = useTheme();
  const clamped = clampProgress(progress);
  const color = toneColor(theme, tone);
  const ticks = size >= 160 ? 60 : 36;
  const radius = size * 0.42;
  const tickWidth = Math.max(2, size * 0.016);
  const tickHeight = size * 0.048;
  const filled = Math.round(clamped * ticks);

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      {Array.from({ length: ticks }, (_, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            width: tickWidth,
            height: tickHeight,
            borderRadius: tickWidth / 2,
            left: (size - tickWidth) / 2,
            top: (size - tickHeight) / 2,
            backgroundColor: index < filled ? color : theme.backgroundSelected,
            transform: [{ rotate: `${(index / ticks) * 360}deg` }, { translateY: -radius }],
          }}
        />
      ))}
    </View>
  );
}

/**
 * Distance-to-alarm dial: ticks fill from where the journey started to the alert
 * radius, and the number in the middle is the remaining distance.
 */
export function DistanceRing({
  distanceM,
  unit,
  progress,
  caption,
  tone = 'accent',
}: {
  distanceM: number | null;
  unit: DistanceUnit;
  /** 0 at the starting distance, 1 at the alert radius. */
  progress: number;
  caption: string;
  tone?: RingTone;
}) {
  const theme = useTheme();
  const color = toneColor(theme, tone);
  const { value, unit: symbol } = splitDistance(distanceM, unit);

  return (
    <View
      accessible
      accessibilityRole="summary"
      accessibilityLabel={`${value} ${symbol} ${caption.toLowerCase()}`}
      style={styles.wrap}>
      <ProgressDial progress={progress} size={RING_SIZE} tone={tone} />

      <View style={styles.center}>
        <Row gap="one" align="center">
          <View style={[styles.rule, { backgroundColor: theme.accentBorder }]} />
          <ThemedText style={[styles.micro, { color: theme.accent }]}>
            {strings.journey.distanceToAlarm}
          </ThemedText>
          <View style={[styles.rule, { backgroundColor: theme.accentBorder }]} />
        </Row>

        <Row gap="half" align="flex-end">
          <ThemedText style={styles.value}>{value}</ThemedText>
          <ThemedText style={[styles.unit, { color }]}>{symbol}</ThemedText>
        </Row>

        <ThemedText style={[styles.caption, { color }]}>{caption}</ThemedText>
      </View>
    </View>
  );
}

/** Small labelled stat under the ring: `● Start · 20 km`. */
export function DistanceStat({
  label,
  value,
  style,
}: {
  label: string;
  value: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.stat, { backgroundColor: theme.backgroundElement }, style]}>
      <View style={[styles.statDot, { backgroundColor: theme.accent }]} />
      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
        {label}
      </ThemedText>
      <ThemedText type="smallBold" numberOfLines={1}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: RING_SIZE,
    height: RING_SIZE,
    alignSelf: 'center',
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.half,
    paddingHorizontal: Spacing.four,
    pointerEvents: 'none',
  },
  rule: {
    flex: 1,
    height: StyleSheet.hairlineWidth * 2,
    minWidth: 10,
  },
  micro: {
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 1.1,
    fontWeight: '700',
  },
  value: {
    fontSize: 40,
    lineHeight: 44,
    fontWeight: '800',
    letterSpacing: -1,
  },
  unit: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '700',
    paddingBottom: 4,
  },
  caption: {
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 1.2,
    fontWeight: '700',
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.one + 2,
    paddingHorizontal: Spacing.two + 2,
    borderRadius: Radii.pill,
    flexShrink: 1,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
