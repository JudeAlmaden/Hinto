import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { strings } from '@/constants/strings';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { TrackingStatus } from '@/modules/location';

export function StatusPill({ status }: { status: TrackingStatus }) {
  const theme = useTheme();

  const copy: Record<TrackingStatus, string> = {
    tracking: strings.journey.tracking,
    waiting: strings.journey.waitingForFix,
    stale: strings.journey.stale,
    paused: strings.journey.paused,
    idle: strings.journey.interrupted,
  };

  const color =
    status === 'tracking'
      ? theme.success
      : status === 'stale' || status === 'waiting'
        ? theme.warning
        : theme.textSecondary;

  return (
    <View style={[styles.pill, { backgroundColor: theme.backgroundElement }]}>
      <View style={[styles.dot, { backgroundColor: color }]} />
      <ThemedText type="small" style={{ color, fontWeight: '700' }}>
        {copy[status]}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: Spacing.half + 2,
    paddingHorizontal: Spacing.two,
    borderRadius: Radii.pill,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
});
