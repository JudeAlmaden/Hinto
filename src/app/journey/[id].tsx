import { useNetInfo } from '@react-native-community/netinfo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { MoreMenu } from '@/components/ui/more-menu';
import { AppButton, Card } from '@/components/ui/controls';
import { Row, Stack } from '@/components/ui/layout';
import { Mascot } from '@/components/ui/mascot';
import { confirmAction } from '@/components/ui/confirm';
import { Screen } from '@/components/ui/screen';
import { StatusPill } from '@/components/ui/status-pill';
import { formatCopy, strings } from '@/constants/strings';
import { Radii, Spacing } from '@/constants/theme';
import { getDatabase } from '@/db/client';
import { useAsyncData } from '@/hooks/use-async';
import { useTracking } from '@/hooks/use-tracking';
import type { Journey, JourneyAlert } from '@/modules/journeys';
import { getJourney, listJourneyAlerts } from '@/modules/journeys/repository';
import { endJourneySession, pauseJourneySession, resumeJourneySession } from '@/modules/location/session';
import { DEFAULT_SETTINGS, type AppSettings } from '@/modules/settings/schema';
import { getSettings } from '@/modules/settings/repository';
import { formatAge, formatCoordinates, formatDistance } from '@/utils/format';
import { progressToRadius } from '@/utils/progress';

interface Detail {
  journey: Journey | null;
  alerts: JourneyAlert[];
  settings: AppSettings;
}

export default function ActiveJourneyScreen() {
  const router = useRouter();
  const net = useNetInfo();
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const tracking = useTracking();
  const [busy, setBusy] = useState(false);

  const state = useAsyncData<Detail>(async () => {
    const db = await getDatabase();
    const [journey, settings] = await Promise.all([getJourney(db, id), getSettings(db)]);
    const alerts = journey ? await listJourneyAlerts(db, journey.id) : [];
    return { journey, alerts, settings };
  }, `journey-${id}`);

  useEffect(() => {
    const timer = setInterval(state.reload, 5000);
    return () => clearInterval(timer);
  }, [state.reload]);

  const journey = state.data?.journey ?? null;
  const settings = state.data?.settings ?? DEFAULT_SETTINGS;
  const unit = settings.distance_unit;

  if (!journey) {
    return (
      <Screen title={strings.journey.title} back>
        <ThemedText type="small" themeColor="textSecondary">
          {state.loading ? strings.common.loading : strings.alarm.noJourney}
        </ThemedText>
      </Screen>
    );
  }

  const distanceM = tracking.lastKnownDistanceM ?? journey.lastKnownDistanceM;
  const progress = progressToRadius(distanceM, journey.radiusM);

  const endJourney = () =>
    confirmAction({
      title: strings.journey.endConfirmTitle,
      body: strings.journey.endConfirmBody,
      confirmLabel: strings.home.end,
      destructive: true,
      onConfirm: () =>
        void run(async () => {
          await endJourneySession(journey.id, 'completed');
          router.replace({ pathname: '/history/[id]', params: { id: journey.id } });
        }),
    });

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      state.reload();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      title={strings.journey.title}
      back
      right={
        <MoreMenu
          items={[
            {
              label: strings.journey.options,
              icon: 'options-outline',
              onPress: () =>
                router.push({ pathname: '/journey/[id]/options', params: { id: journey.id } }),
            },
            {
              label: strings.place.saveDestination,
              icon: 'bookmark-outline',
              onPress: () =>
                router.push({
                  pathname: '/place/new',
                  params: {
                    name: journey.destinationName,
                    latitude: journey.destinationLatitude.toFixed(6),
                    longitude: journey.destinationLongitude.toFixed(6),
                  },
                }),
            },
            {
              label: strings.home.end,
              icon: 'stop-circle-outline',
              destructive: true,
              onPress: endJourney,
            },
          ]}
        />
      }
      footer={
        <Row gap="two">
          <AppButton
            label={journey.status === 'paused' ? strings.home.resume : strings.home.pause}
            variant="secondary"
            disabled={busy}
            onPress={() =>
              run(() =>
                journey.status === 'paused'
                  ? resumeJourneySession(journey.id)
                  : pauseJourneySession(journey.id),
              )
            }
            style={styles.action}
          />
          <AppButton
            label={strings.home.end}
            variant="ghost"
            disabled={busy}
            onPress={endJourney}
            style={styles.action}
          />
        </Row>
      }>
      <Stack gap="one" align="center" pt="three">
        <ThemedText style={styles.destination} numberOfLines={2}>
          {journey.destinationName}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatCoordinates(journey.destinationLatitude, journey.destinationLongitude)}
        </ThemedText>

        <Stack gap="half" align="center" pt="three">
          <ThemedText style={styles.distance}>{formatDistance(distanceM, unit)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {strings.journey.toGo}
          </ThemedText>
        </Stack>
      </Stack>

      <Card style={styles.statusCard}>
        <Row between gap="two">
          <StatusPill status={tracking.status} />
          <ThemedText type="small" themeColor="textSecondary">
            {tracking.accuracyM === null
              ? strings.journey.noFixYet
              : `±${Math.round(tracking.accuracyM)} m`}
          </ThemedText>
        </Row>
        <ThemedText type="small" themeColor="textSecondary">
          {tracking.lastSampleAt === null
            ? strings.journey.noFixYet
            : formatCopy(strings.journey.lastSeen, { age: formatAge(tracking.lastSampleAt) })}
        </ThemedText>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <Row between>
          <ThemedText type="small" themeColor="textSecondary">
            {strings.journey.alertAt} {formatDistance(journey.radiusM, unit)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {net.isConnected === false ? strings.home.offlineNote : strings.journey.tracking}
          </ThemedText>
        </Row>
      </Card>

      {(state.data?.alerts.length ?? 0) > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {strings.alarm.headline} · {formatDistance(state.data?.alerts[0].triggerDistanceM, unit)}
        </ThemedText>
      ) : null}

      <Stack gap="one" align="center" pt="four">
        <Mascot pose="onTheGo" height={120} />
        <ThemedText type="small" themeColor="textSecondary" style={styles.mascotNote}>
          {tracking.lastSampleAt === null
            ? strings.journey.mascotWaiting
            : strings.journey.mascotTracking}
        </ThemedText>
      </Stack>

      <ThemedText type="small" themeColor="textSecondary">
        {strings.journey.disclaimer}
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  gear: {
    fontSize: 22,
  },
  mascotNote: {
    textAlign: 'center',
    paddingHorizontal: Spacing.four,
  },
  destination: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  distance: {
    fontSize: 44,
    fontWeight: '700',
    lineHeight: 50,
  },
  statusCard: {
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  progressTrack: {
    height: 8,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(128,128,128,0.28)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#D99A43',
  },
  action: {
    flex: 1,
  },
});
