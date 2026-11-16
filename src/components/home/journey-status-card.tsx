import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton, Card } from '@/components/ui/controls';
import { Row, Stack } from '@/components/ui/layout';
import { StatusPill } from '@/components/ui/status-pill';
import { formatCopy, strings } from '@/constants/strings';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Journey } from '@/modules/journeys';
import type { TrackingStatus } from '@/modules/location';
import type { DistanceUnit } from '@/modules/settings/schema';
import { formatAge, formatDistance } from '@/utils/format';
import { progressToRadius } from '@/utils/progress';

export function JourneyStatusCard({
  journey,
  status,
  accuracyM,
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
  accuracyM: number | null;
  lastSampleAt: number | null;
  distanceM: number | null;
  unit: DistanceUnit;
  busy: boolean;
  onPauseResume: () => void;
  onEnd: () => void;
  onOpen: () => void;
}) {
  const theme = useTheme();

  return (
    <Card
      style={[
        styles.card,
        {
          backgroundColor: theme.accentSoft,
          borderColor: theme.accentBorder,
          borderWidth: StyleSheet.hairlineWidth * 2,
        },
      ]}>
      <Row between gap="two">
        <StatusPill status={status} />
        <ThemedText type="small" themeColor="textSecondary">
          {strings.journey.alertAt} {formatDistance(journey.radiusM, unit)}
        </ThemedText>
      </Row>

      <ThemedText style={styles.destination} numberOfLines={2}>
        {journey.destinationName}
      </ThemedText>

      <Row gap="two">
        <Stack center flex gap="half">
          <ThemedText style={[styles.statValue, { color: theme.accent }]}>
            {formatDistance(distanceM, unit)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {strings.journey.toGo}
          </ThemedText>
        </Stack>
        <Stack center flex gap="half">
          <ThemedText style={styles.statValue}>
            {accuracyM === null ? strings.common.notAvailable : `±${Math.round(accuracyM)} m`}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {strings.journey.accuracy}
          </ThemedText>
        </Stack>
      </Row>

      <Stack gap="two">
        <View style={[styles.progressTrack, { backgroundColor: theme.backgroundSelected }]}>
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: theme.accent,
                width: `${Math.round(progressToRadius(distanceM, journey.radiusM) * 100)}%`,
              },
            ]}
          />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {formatCopy(strings.journey.lastSeen, { age: formatAge(lastSampleAt) })}
        </ThemedText>
      </Stack>

      <Row gap="two">
        <AppButton
          label={journey.status === 'paused' ? strings.home.resume : strings.home.pause}
          variant="secondary"
          disabled={busy}
          onPress={onPauseResume}
          style={styles.action}
        />
        <AppButton label={strings.home.end} variant="ghost" disabled={busy} onPress={onEnd} style={styles.action} />
      </Row>

      <Row onPress={onOpen}>
        <ThemedText type="small" themeColor="textSecondary">
          {strings.journey.title} ›
        </ThemedText>
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  destination: {
    fontSize: 22,
    fontWeight: '700',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  progressTrack: {
    height: 8,
    borderRadius: Radii.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  action: {
    flex: 1,
  },
});
