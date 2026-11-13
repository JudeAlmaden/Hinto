import { useNetInfo } from '@react-native-community/netinfo';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton, Card } from '@/components/ui/controls';
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
        <Pressable
          onPress={() =>
            router.push({ pathname: '/journey/[id]/options', params: { id: journey.id } })
          }
          hitSlop={12}>
          <ThemedText style={styles.gear}>⚙</ThemedText>
        </Pressable>
      }
      footer={
        <View style={styles.actions}>
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
            onPress={() =>
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
              })
            }
            style={styles.action}
          />
        </View>
      }>
      <View style={styles.hero}>
        <ThemedText style={styles.destination} numberOfLines={2}>
          {journey.destinationName}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatCoordinates(journey.destinationLatitude, journey.destinationLongitude)}
        </ThemedText>

        <View style={styles.distanceBlock}>
          <ThemedText style={styles.distance}>{formatDistance(distanceM, unit)}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {strings.journey.toGo}
          </ThemedText>
        </View>
      </View>

      <Card style={styles.statusCard}>
        <View style={styles.statusRow}>
          <StatusPill status={tracking.status} />
          <ThemedText type="small" themeColor="textSecondary">
            {tracking.accuracyM === null
              ? strings.journey.noFixYet
              : `±${Math.round(tracking.accuracyM)} m`}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {tracking.lastSampleAt === null
            ? strings.journey.noFixYet
            : formatCopy(strings.journey.lastSeen, { age: formatAge(tracking.lastSampleAt) })}
        </ThemedText>

        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${Math.round(progress * 100)}%` }]} />
        </View>
        <View style={styles.progressLabels}>
          <ThemedText type="small" themeColor="textSecondary">
            {strings.journey.alertAt} {formatDistance(journey.radiusM, unit)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {net.isConnected === false ? strings.home.offlineNote : strings.journey.tracking}
          </ThemedText>
        </View>
      </Card>

      {(state.data?.alerts.length ?? 0) > 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {strings.alarm.headline} · {formatDistance(state.data?.alerts[0].triggerDistanceM, unit)}
        </ThemedText>
      ) : null}

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
  hero: {
    alignItems: 'center',
    gap: Spacing.one,
    paddingTop: Spacing.three,
  },
  destination: {
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
  },
  distanceBlock: {
    alignItems: 'center',
    paddingTop: Spacing.three,
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
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  progressTrack: {
    height: 8,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(128,128,128,0.28)',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#208AEF',
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
    flex: 1,
  },
});
