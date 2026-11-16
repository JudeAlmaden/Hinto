import Constants from 'expo-constants';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Share, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton, Card, NavRow, SectionLabel } from '@/components/ui/controls';
import { Row, Stack } from '@/components/ui/layout';
import { ResetStorageDialog } from '@/components/ui/reset-dialog';
import { Screen } from '@/components/ui/screen';
import { formatCopy, strings } from '@/constants/strings';
import { getDatabase, resetStorage, retryStorage } from '@/db/client';
import { useAsyncData } from '@/hooks/use-async';
import { useStorage } from '@/hooks/use-storage';
import { useTracking } from '@/hooks/use-tracking';
import { clearEvents, type DiagnosticEvent } from '@/modules/diagnostics';
import { buildDiagnosticsExport } from '@/modules/diagnostics/export';
import {
  clearDiagnosticEvents,
  listDiagnosticEvents,
} from '@/modules/diagnostics/repository';
import { selectPolicy, describePolicy } from '@/modules/geofence/policy';
import type { Journey } from '@/modules/journeys';
import { getActiveJourney, listJourneys, listAlertsForJourneys } from '@/modules/journeys/repository';
import { DEFAULT_SETTINGS, type AppSettings } from '@/modules/settings/schema';
import { getSettings } from '@/modules/settings/repository';
import { computeMetrics, type Metrics } from '@/modules/stats/metrics';
import { formatDateTime } from '@/utils/format';

interface DiagnosticsData {
  events: DiagnosticEvent[];
  journey: Journey | null;
  settings: AppSettings;
  metrics: Metrics;
}

function percent(value: number | null): string {
  return value === null ? strings.diagnostics.notAvailable : `${Math.round(value * 100)}%`;
}

function number(value: number | null): string {
  return value === null ? strings.diagnostics.notAvailable : String(value);
}

export default function DiagnosticsScreen() {
  const storage = useStorage();
  const tracking = useTracking();
  const [resetVisible, setResetVisible] = useState(false);

  const state = useAsyncData<DiagnosticsData>(async () => {
    const db = await getDatabase();
    const [events, journeys, settings, journey] = await Promise.all([
      listDiagnosticEvents(db, 100),
      listJourneys(db, { limit: 200 }),
      getSettings(db),
      getActiveJourney(db),
    ]);
    const alerts = await listAlertsForJourneys(db, journeys.map((item) => item.id));
    return { events, journey, settings, metrics: computeMetrics(journeys, alerts) };
  }, 'diagnostics');

  const { reload } = state;

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const data = state.data;
  const settings = data?.settings ?? DEFAULT_SETTINGS;
  const metrics = data?.metrics;

  const policy = selectPolicy({
    distanceM: tracking.lastKnownDistanceM,
    batteryLevelPct: null,
    batterySaver: settings.battery_saver,
    stationaryMs: 0,
  });

  const share = async () => {
    if (!data) return;
    const message = buildDiagnosticsExport({
      events: data.events,
      metrics: data.metrics,
      storage: {
        state: storage.state,
        schemaVersion: storage.schemaVersion,
        integrityOk: storage.integrityOk,
      },
      appVersion: Constants.expoConfig?.version ?? '0.0.0',
    });
    await Share.share({ message });
  };

  return (
    <Screen title={strings.diagnostics.title} back>
      <SectionLabel>{strings.diagnostics.storageState}</SectionLabel>
      <View>
        <NavRow label={strings.diagnostics.schemaVersion} value={String(storage.schemaVersion)} />
        <NavRow
          label={strings.diagnostics.integrity}
          value={storage.integrityOk ? 'ok' : strings.common.notAvailable}
        />
        <NavRow label={strings.diagnostics.storageState} value={storage.state} last />
      </View>

      {storage.state === 'unavailable' ? (
        <Card>
          <Stack gap="one" py="three">
          <ThemedText type="small">{strings.diagnostics.storageUnavailable}</ThemedText>
          <Row gap="two">
            <AppButton
              label={strings.common.retry}
              variant="secondary"
              onPress={() => void retryStorage()}
              style={styles.action}
            />
            <AppButton
              label={strings.diagnostics.resetStorage}
              variant="ghost"
              onPress={() => setResetVisible(true)}
              style={styles.action}
            />
          </Row>
          </Stack>
        </Card>
      ) : null}

      <SectionLabel>{strings.diagnostics.samples}</SectionLabel>
      <Card>
        <Stack gap="one" py="three">
        <ThemedText type="small">
          {tracking.lastSample
            ? `${formatDateTime(tracking.lastSample.timestamp)} · ±${Math.round(
                tracking.lastSample.accuracyM,
              )} m`
            : strings.diagnostics.noSamples}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {strings.diagnostics.policyInterval}: {describePolicy(policy)}
        </ThemedText>
        </Stack>
      </Card>

      <SectionLabel>{strings.diagnostics.metrics}</SectionLabel>
      <View>
        <NavRow
          label={strings.diagnostics.metricJourneyStart}
          value={percent(metrics?.journeyStartRate ?? null)}
        />
        <NavRow
          label={strings.diagnostics.metricAlertSuccess}
          value={percent(metrics?.alertSuccessRate ?? null)}
        />
        <NavRow
          label={strings.diagnostics.metricAlertDelay}
          value={
            metrics?.medianAlertDelayMs === null || metrics?.medianAlertDelayMs === undefined
              ? strings.diagnostics.notAvailable
              : `${Math.round(metrics.medianAlertDelayMs / 1000)} s`
          }
        />
        <NavRow label={strings.diagnostics.metricMissed} value={number(metrics?.missedAlerts ?? null)} />
        <NavRow
          label={strings.diagnostics.metricDuplicates}
          value={number(metrics?.duplicateAlerts ?? null)}
        />
        <NavRow
          label={strings.diagnostics.metricBattery}
          value={
            metrics?.batteryPerHourPct === null || metrics?.batteryPerHourPct === undefined
              ? strings.diagnostics.notAvailable
              : `${metrics.batteryPerHourPct.toFixed(1)}%/h`
          }
        />
        <NavRow
          label={strings.diagnostics.metricPlaceReuse}
          value={percent(metrics?.savedPlaceReuseRate ?? null)}
          last
        />
      </View>

      <SectionLabel right={
        <ThemedText type="small" themeColor="textSecondary">
          {formatCopy(strings.diagnostics.eventsCount, { count: data?.events.length ?? 0 })}
        </ThemedText>
      }>
        {strings.diagnostics.events}
      </SectionLabel>

      <Card>
        <Stack gap="one" py="three">
        {(data?.events.length ?? 0) === 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {strings.diagnostics.empty}
          </ThemedText>
        ) : (
          data?.events.slice(0, 40).map((event, index) => (
            <ThemedText
              key={`${event.timestamp}-${event.name}-${index}`}
              type="small"
              themeColor="textSecondary"
              numberOfLines={2}>
              {formatDateTime(event.timestamp)} · {event.kind}/{event.name}
            </ThemedText>
          ))
        )}
        </Stack>
      </Card>

      <ThemedText type="small" themeColor="textSecondary">
        {strings.diagnostics.privacy}
      </ThemedText>

      <Row gap="two">
        <AppButton label={strings.diagnostics.share} variant="secondary" onPress={() => void share()} style={styles.action} />
        <AppButton
          label={strings.diagnostics.clear}
          variant="ghost"
          onPress={() => {
            void (async () => {
              const db = await getDatabase();
              await clearDiagnosticEvents(db);
              clearEvents();
              state.reload();
            })();
          }}
          style={styles.action}
        />
      </Row>

      <ResetStorageDialog
        visible={resetVisible}
        onCancel={() => setResetVisible(false)}
        onConfirm={() => {
          setResetVisible(false);
          void resetStorage().catch(() => undefined);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  action: {
    flex: 1,
  },
});
