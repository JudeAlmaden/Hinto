import { Pressable, StyleSheet, View } from 'react-native';

import { ProgressDial, type RingTone } from '@/components/journey/distance-ring';
import { ThemedText } from '@/components/themed-text';
import { AppButton } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { Row, Stack } from '@/components/ui/layout';
import { formatCopy, strings } from '@/constants/strings';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Journey } from '@/modules/journeys';
import type { TrackingStatus } from '@/modules/location';
import type { DistanceUnit } from '@/modules/settings/schema';
import { formatAge, formatDistance } from '@/utils/format';
import { journeyProgress } from '@/utils/progress';

/**
 * The active journey, as a place rather than a dashboard: where you're headed,
 * how far is left, and the two things you can do about it. Status is only
 * spelled out when it is not simply "tracking".
 */
export function JourneyStatusCard({
  journey,
  status,
  lastSampleAt,
  distanceM,
  unit,
  busy,
  onPauseResume,
  onEnd,
  onOpen,
}: {
  journey: Journey;
  status: TrackingStatus;
  lastSampleAt: number | null;
  distanceM: number | null;
  unit: DistanceUnit;
  busy: boolean;
  onPauseResume: () => void;
  onEnd: () => void;
  onOpen: () => void;
}) {
  const theme = useTheme();
  const isPaused = journey.status === 'paused';
  const progress = journeyProgress(distanceM, journey.startDistanceM, journey.radiusM);

  const line = (() => {
    if (journey.status === 'triggered') {
      return { text: strings.journey.triggered, tone: 'danger' as RingTone };
    }
    if (isPaused) {
      return { text: strings.journey.alarmOffWhilePaused, tone: 'muted' as RingTone };
    }
    if (status === 'stale') {
      return {
        text: formatCopy(strings.journey.staleFor, { age: formatAge(lastSampleAt) }),
        tone: 'warning' as RingTone,
      };
    }
    if (status === 'waiting' || lastSampleAt === null) {
      return { text: strings.journey.waitingForFix, tone: 'warning' as RingTone };
    }
    return {
      text: formatCopy(strings.journey.updatedAt, { age: formatAge(lastSampleAt) }),
      tone: 'muted' as RingTone,
    };
  })();

  const dialTone: RingTone =
    journey.status === 'triggered'
      ? 'danger'
      : status === 'stale' || status === 'waiting' || lastSampleAt === null
        ? 'warning'
        : isPaused
          ? 'muted'
          : 'accent';

  const lineColor =
    line.tone === 'danger'
      ? theme.danger
      : line.tone === 'warning'
        ? theme.warning
        : theme.textSecondary;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${journey.destinationName}, ${formatDistance(distanceM, unit)} ${strings.journey.toGo}. ${line.text}`}
      onPress={onOpen}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: theme.accentSoft,
          borderColor: theme.accentBorder,
          borderWidth: StyleSheet.hairlineWidth * 2,
        },
        pressed && styles.pressed,
      ]}>
      <Row gap="two" align="center">
        <View style={[styles.pinBadge, { backgroundColor: theme.accent }]}>
          <Icon name="location" size={16} color={theme.accentText} />
        </View>
        <ThemedText style={styles.destination} numberOfLines={2}>
          {journey.destinationName}
        </ThemedText>
        <Icon name="chevron-forward" size={16} themeColor="textSecondary" />
      </Row>

      <Row between gap="three" align="center">
        <Stack gap="half" flex>
          <Row gap="one" align="flex-end">
            <ThemedText style={styles.heroValue}>{formatDistance(distanceM, unit)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.heroSuffix}>
              {strings.journey.toGo}
            </ThemedText>
          </Row>
          <ThemedText type="small" style={{ color: lineColor }}>
            {line.text}
          </ThemedText>
        </Stack>

        <ProgressDial progress={progress} size={64} tone={dialTone} />
      </Row>

      <Row gap="two" style={styles.actions}>
        <AppButton
          label={isPaused ? strings.home.resume : strings.home.pause}
          variant="secondary"
          disabled={busy}
          onPress={onPauseResume}
          style={styles.action}
        />
        <AppButton
          label={strings.home.end}
          variant="dangerGhost"
          disabled={busy}
          onPress={onEnd}
          style={styles.action}
        />
      </Row>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: Radii.large,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.three,
    gap: Spacing.two + Spacing.one,
  },
  pressed: {
    opacity: 0.94,
  },
  pinBadge: {
    width: 32,
    height: 32,
    borderRadius: Radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  destination: {
    flex: 1,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  heroValue: {
    fontSize: 30,
    lineHeight: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  heroSuffix: {
    paddingBottom: 3,
  },
  actions: {
    marginTop: Spacing.one,
  },
  action: {
    flex: 1,
  },
});
