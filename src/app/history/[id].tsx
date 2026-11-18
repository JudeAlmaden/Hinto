import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton, Card, NavRow } from '@/components/ui/controls';
import { Stack } from '@/components/ui/layout';
import { Mascot } from '@/components/ui/mascot';
import { confirmAction } from '@/components/ui/confirm';
import { MoreMenu } from '@/components/ui/more-menu';
import { Screen } from '@/components/ui/screen';
import { strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { getDatabase } from '@/db/client';
import { useAsyncData } from '@/hooks/use-async';
import type { Journey, JourneyAlert } from '@/modules/journeys';
import { deleteJourney, getJourney, listJourneyAlerts } from '@/modules/journeys/repository';
import { DEFAULT_SETTINGS, type AppSettings } from '@/modules/settings/schema';
import { getSettings } from '@/modules/settings/repository';
import { formatDateTime, formatDistance, formatDuration, formatPercent } from '@/utils/format';

interface Detail {
  journey: Journey | null;
  alerts: JourneyAlert[];
  settings: AppSettings;
}

export default function JourneyHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';

  const state = useAsyncData<Detail>(async () => {
    const db = await getDatabase();
    const [journey, settings] = await Promise.all([getJourney(db, id), getSettings(db)]);
    const alerts = journey ? await listJourneyAlerts(db, journey.id) : [];
    return { journey, alerts, settings };
  }, `history-${id}`);

  const journey = state.data?.journey ?? null;
  const settings = state.data?.settings ?? DEFAULT_SETTINGS;
  const alert = state.data?.alerts[0] ?? null;
  const unit = settings.distance_unit;

  if (!journey) {
    return (
      <Screen title={strings.history.detailTitle} back>
        <ThemedText type="small" themeColor="textSecondary">
          {state.loading ? strings.common.loading : strings.history.emptyTitle}
        </ThemedText>
      </Screen>
    );
  }

  const duration =
    journey.startedAt !== null && journey.endedAt !== null
      ? journey.endedAt - journey.startedAt
      : null;

  const outcome =
    journey.status === 'interrupted'
      ? strings.history.interrupted
      : journey.status === 'cancelled'
        ? strings.history.cancelled
        : alert
          ? `${strings.history.alerted.replace('{distance}', formatDistance(alert.triggerDistanceM, unit))}, ${
              alert.snoozedUntil !== null ? strings.history.snoozed : strings.history.dismissed
            }`
          : strings.history.notTriggered;

  const confirmDelete = () =>
    confirmAction({
      title: strings.places.title,
      body: strings.history.clearBody,
      confirmLabel: strings.common.delete,
      destructive: true,
      onConfirm: () => {
        void (async () => {
          const db = await getDatabase();
          await deleteJourney(db, journey.id);
          router.back();
        })();
      },
    });

  return (
    <Screen
      title={strings.history.detailTitle}
      subtitle={journey.destinationName}
      back
      footer={
        <AppButton
          label={strings.alarm.goHome}
          variant="primary"
          onPress={() => router.replace('/')}
        />
      }
      right={
        <MoreMenu
          items={[
            {
              label: strings.common.delete,
              icon: 'trash-outline',
              destructive: true,
              onPress: confirmDelete,
            },
          ]}
        />
      }>
      {journey.status === 'completed' ? (
        <Card>
          <Stack gap="one" align="center" py="three">
            <Mascot pose="ready" height={128} />
            <ThemedText style={styles.celebrationTitle}>{strings.history.arrivedTitle}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.celebrationBody}>
              {strings.history.arrivedBody}
            </ThemedText>
          </Stack>
        </Card>
      ) : null}

      <View>
        <NavRow label={strings.history.outcome} value={outcome} />
        <NavRow label={strings.history.startedAt} value={formatDateTime(journey.startedAt ?? journey.createdAt)} />
        <NavRow
          label={strings.history.endedAtLabel}
          value={journey.endedAt === null ? strings.common.notAvailable : formatDateTime(journey.endedAt)}
        />
        <NavRow label={strings.history.durationLabel} value={formatDuration(duration)} />
        <NavRow label={strings.history.configuredRadius} value={formatDistance(journey.radiusM, unit)} />
        <NavRow
          label={strings.history.triggerDistance}
          value={alert ? formatDistance(alert.triggerDistanceM, unit) : strings.history.notTriggered}
        />
        <NavRow
          label={strings.history.triggerAccuracy}
          value={alert?.accuracyM === null || alert?.accuracyM === undefined ? strings.common.notAvailable : `±${Math.round(alert.accuracyM)} m`}
        />
        <NavRow
          label={strings.history.finalDistance}
          value={formatDistance(journey.lastKnownDistanceM, unit)}
        />
        <NavRow label={strings.history.startBattery} value={formatPercent(journey.startBatteryPct)} />
        <NavRow label={strings.history.endBattery} value={formatPercent(journey.endBatteryPct)} last />
      </View>

      <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
        {strings.diagnostics.privacy}
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  celebrationTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  celebrationBody: {
    textAlign: 'center',
  },
  note: {
    paddingTop: Spacing.two,
  },
});
