import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { EmptyState, SectionLabel } from '@/components/ui/controls';
import { confirmAction } from '@/components/ui/confirm';
import { Screen } from '@/components/ui/screen';
import { formatCopy, strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { getDatabase } from '@/db/client';
import { useAsyncData } from '@/hooks/use-async';
import { groupSummaries, summariseJourney } from '@/modules/history/summary';
import type { JourneySummary } from '@/modules/history';
import { TERMINAL_STATUSES, type Journey, type JourneyAlert } from '@/modules/journeys';
import {
  clearJourneyHistory,
  listAlertsForJourneys,
  listJourneys,
} from '@/modules/journeys/repository';
import { DEFAULT_SETTINGS, type AppSettings } from '@/modules/settings/schema';
import { getSettings } from '@/modules/settings/repository';
import { formatClock, formatDistance, formatDuration } from '@/utils/format';

interface HistoryData {
  journeys: Journey[];
  alerts: JourneyAlert[];
  settings: AppSettings;
}

export default function HistoryScreen() {
  const router = useRouter();

  const state = useAsyncData<HistoryData>(async () => {
    const db = await getDatabase();
    const [journeys, settings] = await Promise.all([
      listJourneys(db, { statuses: [...TERMINAL_STATUSES], limit: 100 }),
      getSettings(db),
    ]);
    const alerts = await listAlertsForJourneys(db, journeys.map((journey) => journey.id));
    return { journeys, alerts, settings };
  }, 'history');

  const { reload } = state;

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  const settings = state.data?.settings ?? DEFAULT_SETTINGS;
  const journeys = state.data?.journeys ?? [];
  const alerts = state.data?.alerts ?? [];

  const summaries = journeys.map((journey) =>
    summariseJourney(
      journey,
      alerts.filter((alert) => alert.journeyId === journey.id),
    ),
  );
  const groups = groupSummaries(summaries);

  const outcome = (summary: JourneySummary): string => {
    if (summary.status === 'interrupted') return strings.history.interrupted;
    if (summary.status === 'cancelled') return strings.history.cancelled;
    if (summary.alertType === null) return strings.history.noAlert;
    const distance = formatDistance(summary.triggerDistanceM, settings.distance_unit);
    return `${formatCopy(strings.history.alerted, { distance })} · ${
      summary.alertType === 'snooze' ? strings.history.snoozed : strings.history.dismissed
    }`;
  };

  return (
    <Screen
      title={strings.history.title}
      tabInset
      right={
        summaries.length > 0 ? (
          <Pressable
            hitSlop={12}
            onPress={() =>
              confirmAction({
                title: strings.history.clearTitle,
                body: strings.history.clearBody,
                confirmLabel: strings.history.clearHistory,
                destructive: true,
                onConfirm: () => {
                  void (async () => {
                    const db = await getDatabase();
                    await clearJourneyHistory(db);
                    state.reload();
                  })();
                },
              })
            }>
            <ThemedText type="small" themeColor="textSecondary">
              {strings.history.clearHistory}
            </ThemedText>
          </Pressable>
        ) : null
      }>
      {state.loading && summaries.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {strings.common.loading}
        </ThemedText>
      ) : summaries.length === 0 ? (
        <EmptyState
          title={strings.history.emptyTitle}
          body={strings.history.emptyBody}
          actionLabel={strings.history.planJourney}
          onAction={() => router.push('/')}
        />
      ) : (
        <>
          <ThemedText type="small" themeColor="textSecondary">
            {formatCopy(strings.history.summaryAlerts, {
              count: summaries.length,
              alerts: summaries.filter((summary) => summary.alertType !== null).length,
            })}
          </ThemedText>

          {groups.map((group) => (
            <View key={group.bucket}>
              <SectionLabel>
                {group.bucket === 'today'
                  ? strings.history.today
                  : group.bucket === 'yesterday'
                    ? strings.history.yesterday
                    : strings.history.earlier}
              </SectionLabel>
              {group.items.map((summary) => (
                <Pressable
                  key={summary.id}
                  onPress={() => router.push({ pathname: '/history/[id]', params: { id: summary.id } })}
                  style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
                  <View style={styles.rowText}>
                    <View style={styles.rowHeader}>
                      <ThemedText style={styles.name} numberOfLines={1}>
                        {summary.destinationName}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary">
                        {formatClock(summary.startedAt)}
                      </ThemedText>
                    </View>
                    <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                      {outcome(summary)}
                    </ThemedText>
                    <ThemedText type="small" themeColor="textSecondary">
                      {formatDuration(summary.durationMs)}
                      {summary.finalDistanceM === null
                        ? ''
                        : ` · ${formatCopy(strings.history.endedAt, {
                            distance: formatDistance(summary.finalDistanceM, settings.distance_unit),
                          })}`}
                    </ThemedText>
                  </View>
                  <ThemedText type="small" themeColor="textSecondary">
                    ›
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          ))}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.3)',
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  rowHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  name: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
});
