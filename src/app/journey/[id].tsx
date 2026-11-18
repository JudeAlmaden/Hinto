import { useNetInfo } from '@react-native-community/netinfo';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useState } from 'react';
import { AppState, BackHandler, Pressable, StyleSheet, View } from 'react-native';

import { ReadinessCard } from '@/components/home/readiness-card';
import { DistanceRing, type RingTone } from '@/components/journey/distance-ring';
import { ThemedText } from '@/components/themed-text';
import { MoreMenu } from '@/components/ui/more-menu';
import { AppButton, Card } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { Row, Stack } from '@/components/ui/layout';
import { Mascot, type MascotPose } from '@/components/ui/mascot';
import { confirmAction } from '@/components/ui/confirm';
import { Screen } from '@/components/ui/screen';
import { strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { getDatabase } from '@/db/client';
import { useAsyncData } from '@/hooks/use-async';
import { useTheme } from '@/hooks/use-theme';
import { useTracking } from '@/hooks/use-tracking';
import { TERMINAL_STATUSES, type Journey, type JourneyAlert } from '@/modules/journeys';
import { getJourney, listJourneyAlerts } from '@/modules/journeys/repository';
import {
  endJourneySession,
  pauseJourneySession,
  refreshJourneySession,
  resumeJourneySession,
} from '@/modules/location/session';
import type { ReadinessIssue } from '@/modules/permissions';
import { getReadinessIssues } from '@/modules/permissions/service';
import { DEFAULT_SETTINGS, type AppSettings } from '@/modules/settings/schema';
import { getSettings } from '@/modules/settings/repository';
import { formatAge, formatCoordinates, formatDistance, formatElapsedTime } from '@/utils/format';
import { openJourneyResult } from '@/utils/navigation';
import { journeyProgress } from '@/utils/progress';

interface Detail {
  journey: Journey | null;
  alerts: JourneyAlert[];
  settings: AppSettings;
}

export default function ActiveJourneyScreen() {
  const router = useRouter();
  const theme = useTheme();
  const net = useNetInfo();
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const tracking = useTracking();
  const [busy, setBusy] = useState(false);
  /** Black "sleep screen": the UI goes dark, tracking and the alarm continue. */
  const [sleeping, setSleeping] = useState(false);

  const [issues, setIssues] = useState<ReadinessIssue[]>([]);
  const [now, setNow] = useState(() => Date.now());

  // While the sleep screen is up, back wakes it instead of leaving the journey.
  useEffect(() => {
    if (!sleeping) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setSleeping(false);
      return true;
    });
    return () => sub.remove();
  }, [sleeping]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const state = useAsyncData<Detail>(async () => {
    const db = await getDatabase();
    // The same watchdog tick that runs on Home runs here: a journey that has
    // lost its fix for too long is interrupted and finished from this screen
    // too — never left running, and never retried.
    await refreshJourneySession();
    const [journey, settings] = await Promise.all([getJourney(db, id), getSettings(db)]);
    const alerts = journey ? await listJourneyAlerts(db, journey.id) : [];
    return { journey, alerts, settings };
  }, `journey-${id}`);

  useEffect(() => {
    const timer = setInterval(state.reload, 5000);
    return () => clearInterval(timer);
  }, [state.reload]);

  // A permission revoked in Android Settings must show up here the moment the
  // user is back: coming back from Settings never re-mounts this screen.
  const refreshReadiness = useCallback(() => {
    void getReadinessIssues()
      .then(setIssues)
      .catch(() => undefined);
  }, []);

  useFocusEffect(
    useCallback(() => {
      refreshReadiness();
    }, [refreshReadiness]),
  );

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') refreshReadiness();
    });
    return () => subscription.remove();
  }, [refreshReadiness]);

  const journey = state.data?.journey ?? null;
  const alerts = state.data?.alerts ?? [];
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

  // Reached only if an ended journey is opened again (Back or a stale link):
  // it must not offer live controls or a countdown.
  if (TERMINAL_STATUSES.includes(journey.status)) {
    return (
      <Screen title={strings.journey.title} back>
        <Card>
          <Stack gap="one" align="center" py="three">
            <Mascot pose="ready" height={112} />
            <ThemedText style={styles.endedTitle}>{strings.journey.endedTitle}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary" style={styles.endedBody}>
              {strings.journey.endedBody}
            </ThemedText>
          </Stack>
        </Card>
        <AppButton
          label={strings.journey.viewSummary}
          onPress={() =>
            router.replace({ pathname: '/history/[id]', params: { id: journey.id } })
          }
        />
      </Screen>
    );
  }

  const distanceM = tracking.lastKnownDistanceM ?? journey.lastKnownDistanceM;
  const progress = journeyProgress(distanceM, journey.startDistanceM, journey.radiusM);
  const isTriggered = journey.status === 'triggered';
  const isPaused = journey.status === 'paused';
  const isOffline = net.isConnected === false;
  const hasSample = tracking.lastSampleAt !== null;
  const elapsedMs = journey.startedAt ? Math.max(0, now - journey.startedAt) : null;

  // One caption per state the rider can actually land in, and the pose that
  // goes with it. New mascot art only needs the pose names to stay the same.
  const ringCaption =
    distanceM === null
      ? strings.journey.waitingShort
      : isPaused
        ? strings.journey.pausedShort
        : tracking.status === 'stale'
          ? strings.journey.staleShort
          : isTriggered
            ? strings.journey.triggeredShort
            : strings.journey.remainingLabel;
  const ringTone: RingTone = isTriggered
    ? 'danger'
    : tracking.status === 'stale'
      ? 'warning'
      : isPaused
        ? 'muted'
        : 'accent';

  // Normal tracking needs no explanation: the hero card already says where and
  // how far. A second sentence only earns its place when something is off.
  const guidance: { title: string; body: string | null; pose: MascotPose } = isPaused
    ? { title: strings.journey.mascotPaused, body: strings.journey.mascotPausedBody, pose: 'ready' }
    : tracking.status === 'stale'
      ? { title: strings.journey.mascotStale, body: strings.journey.mascotStaleBody, pose: 'alert' }
      : tracking.status === 'tracking'
        ? { title: strings.journey.mascotTracking, body: null, pose: 'onTheGo' }
        : {
            title: strings.journey.mascotWaiting,
            body: strings.journey.mascotWaitingBody,
            pose: 'navigator',
          };

  const telemetry = [
    tracking.accuracyM !== null ? `±${Math.round(tracking.accuracyM)} m` : null,
    hasSample ? formatAge(tracking.lastSampleAt) : null,
    isOffline || isPaused
      ? isOffline
        ? strings.home.offlineNote
        : strings.journey.alarmOffWhilePaused
      : null,
  ].filter((part): part is string => part !== null);

  const stopAlarmAndEnd = () =>
    void run(async () => {
      await endJourneySession(journey.id, 'completed');
      openJourneyResult(router, journey.id);
    });

  const endJourney = () =>
    confirmAction({
      title: strings.journey.endConfirmTitle,
      body: strings.journey.endConfirmBody,
      confirmLabel: strings.home.end,
      destructive: true,
      onConfirm: () =>
        void run(async () => {
          // Ending early is abandoning the trip, not arriving: it must not be
          // recorded as a completed journey.
          await endJourneySession(journey.id, 'cancelled');
          openJourneyResult(router, journey.id);
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

  const statusColor =
    tracking.status === 'tracking'
      ? theme.success
      : tracking.status === 'stale' || tracking.status === 'waiting'
        ? theme.warning
        : theme.textSecondary;

  const statusText =
    tracking.status === 'tracking'
      ? strings.journey.tracking
      : tracking.status === 'waiting'
        ? strings.journey.waitingForFix
        : tracking.status === 'stale'
          ? strings.journey.stale
          : tracking.status === 'paused'
            ? strings.journey.paused
            : strings.journey.interrupted;

  return (
    <>
    <Screen
      title={strings.journey.title}
      scroll={false}
      right={
        <Row gap="one" align="center">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={strings.journey.sleep}
            accessibilityHint={strings.journey.sleepHint}
            hitSlop={8}
            onPress={() => setSleeping(true)}
            style={({ pressed }) => [styles.headerButton, pressed && styles.headerButtonDim]}>
            <Icon name="moon-outline" size={21} themeColor="text" />
          </Pressable>
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
        </Row>
      }
      footer={
        isTriggered ? (
          <AppButton
            label={strings.alarm.imAwake}
            variant="danger"
            disabled={busy}
            onPress={stopAlarmAndEnd}
          />
        ) : (
          <Row gap="two">
            {isPaused ? (
              <AppButton
                label={strings.home.resume}
                variant="primary"
                disabled={busy}
                onPress={() => run(() => resumeJourneySession(journey.id))}
                style={styles.action}
              />
            ) : (
              <AppButton
                label={strings.home.pause}
                variant="primary"
                disabled={busy}
                onPress={() => run(() => pauseJourneySession(journey.id))}
                style={styles.action}
              />
            )}
            <AppButton
              label={strings.home.end}
              variant="dangerGhost"
              disabled={busy}
              onPress={endJourney}
              style={styles.action}
            />
          </Row>
        )
      }>
      <View style={styles.container}>
        {isTriggered ? (
          <Card style={[styles.triggeredCard, { borderColor: theme.danger }]}>
            <Row gap="two" align="center">
              <Icon name="alarm" size={26} color={theme.danger} />
              <Stack gap={0} style={styles.flexOne}>
                <ThemedText style={[styles.triggeredTitle, { color: theme.danger }]}>
                  {strings.alarm.headline}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {strings.alarm.limitation}
                </ThemedText>
              </Stack>
            </Row>
          </Card>
        ) : null}

        <Card
          style={[
            styles.hero,
            {
              backgroundColor: theme.accentSoft,
              borderColor: theme.accentBorder,
              borderWidth: StyleSheet.hairlineWidth * 2,
            },
          ]}>
          <Stack gap="half" align="center" style={styles.destinationBlock}>
            <Row gap="one" align="center" justify="center">
              <Icon name="location-sharp" size={18} color={theme.accent} />
              <ThemedText style={styles.destination} numberOfLines={2}>
                {journey.destinationName}
              </ThemedText>
            </Row>
            <ThemedText type="small" themeColor="textSecondary" style={styles.coordinates}>
              {formatCoordinates(journey.destinationLatitude, journey.destinationLongitude)}
            </ThemedText>
          </Stack>

          <DistanceRing
            distanceM={distanceM}
            unit={unit}
            progress={progress}
            caption={ringCaption}
            tone={ringTone}
          />

          <View style={[styles.tripStatsRow, { borderTopColor: theme.accentBorder }]}>
            <View style={styles.tripStatItem}>
              <ThemedText style={[styles.tripStatLabel, { color: theme.textSecondary }]}>
                {strings.journey.start}
              </ThemedText>
              <ThemedText style={styles.tripStatValue}>
                {journey.startDistanceM === null
                  ? '—'
                  : formatDistance(journey.startDistanceM, unit)}
              </ThemedText>
            </View>
            <View style={[styles.tripStatDivider, { backgroundColor: theme.accentBorder }]} />
            <View style={styles.tripStatItem}>
              <ThemedText style={[styles.tripStatLabel, { color: theme.textSecondary }]}>
                {strings.journey.elapsed}
              </ThemedText>
              <ThemedText style={styles.tripStatValue}>
                {formatElapsedTime(elapsedMs)}
              </ThemedText>
            </View>
            <View style={[styles.tripStatDivider, { backgroundColor: theme.accentBorder }]} />
            <View style={styles.tripStatItem}>
              <ThemedText style={[styles.tripStatLabel, { color: theme.textSecondary }]}>
                {strings.journey.alertLabel}
              </ThemedText>
              <ThemedText style={styles.tripStatValue}>
                {formatDistance(journey.radiusM, unit)}
              </ThemedText>
            </View>
            {alerts.length > 0 ? (
              <>
                <View style={[styles.tripStatDivider, { backgroundColor: theme.accentBorder }]} />
                <View style={styles.tripStatItem}>
                  <ThemedText style={[styles.tripStatLabel, { color: theme.textSecondary }]}>
                    {strings.journeySetup.earlierWarning}
                  </ThemedText>
                  <ThemedText style={styles.tripStatValue}>
                    {formatDistance(alerts[0].triggerDistanceM, unit)}
                  </ThemedText>
                </View>
              </>
            ) : null}
          </View>
        </Card>

        {issues.length > 0 || tracking.restrictionSuspected ? (
          <ReadinessCard
            issues={issues}
            restrictionSuspected={tracking.restrictionSuspected}
            onFix={() => router.push('/settings/permissions')}
          />
        ) : null}

        <View style={styles.flexSpacer} />

        <Stack gap="two" align="center" style={styles.companionSection}>
          <Stack gap="one" align="center" style={styles.companionText}>
            <ThemedText style={styles.companionTitle} numberOfLines={2}>
              {guidance.title}
            </ThemedText>

            {guidance.body ? (
              <ThemedText
                type="small"
                themeColor="textSecondary"
                numberOfLines={2}
                style={styles.companionBody}>
                {guidance.body}
              </ThemedText>
            ) : null}

            {tracking.status !== 'tracking' || telemetry.length > 0 ? (
              <Row gap="one" align="center" style={styles.telemetryRow}>
                {tracking.status !== 'tracking' ? (
                  <View style={styles.telemetryTag}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <ThemedText style={[styles.statusText, { color: statusColor }]}>
                      {statusText}
                    </ThemedText>
                  </View>
                ) : null}
                {telemetry.length > 0 ? (
                  <ThemedText
                    style={[styles.telemetryMeta, { color: theme.textSecondary }]}
                    numberOfLines={1}>
                    {telemetry.join(', ')}
                  </ThemedText>
                ) : null}
              </Row>
            ) : null}
          </Stack>

          <Mascot pose={guidance.pose} height={96} />
        </Stack>

        <ThemedText themeColor="textSecondary" style={styles.footnote}>
          {strings.journey.disclaimer}
        </ThemedText>
      </View>
    </Screen>

      {sleeping ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={strings.journey.wake}
          onPress={() => setSleeping(false)}
          style={styles.sleepOverlay}>
          <ThemedText style={styles.sleepHint}>{strings.journey.wake}</ThemedText>
        </Pressable>
      ) : null}
      <StatusBar hidden={sleeping} />
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.one,
    gap: Spacing.three,
  },
  flexSpacer: {
    flex: 1,
  },
  hero: {
    paddingVertical: Spacing.two + 4,
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  destinationBlock: {
    paddingHorizontal: Spacing.two,
  },
  destination: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '700',
    textAlign: 'center',
    flexShrink: 1,
  },
  coordinates: {
    fontSize: 12,
    lineHeight: 16,
    textAlign: 'center',
  },
  tripStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth * 2,
    paddingTop: Spacing.two,
    marginTop: Spacing.half,
  },
  tripStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  tripStatDivider: {
    width: StyleSheet.hairlineWidth * 2,
    height: 24,
  },
  tripStatLabel: {
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '600',
  },
  tripStatValue: {
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '700',
  },
  companionSection: {
    paddingHorizontal: Spacing.half,
  },
  companionText: {
    alignItems: 'center',
    maxWidth: 320,
  },
  companionTitle: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '600',
    textAlign: 'center',
  },
  sleepOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 72,
    zIndex: 20,
  },
  sleepHint: {
    color: 'rgba(255, 255, 255, 0.35)',
    fontSize: 13,
    letterSpacing: 0.3,
  },
  companionBody: {
    textAlign: 'center',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerButtonDim: {
    opacity: 0.5,
  },
  telemetryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: Spacing.one,
    flexWrap: 'wrap',
  },
  telemetryTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '700',
  },
  telemetryMeta: {
    fontSize: 13,
    lineHeight: 18,
  },
  triggeredCard: {
    paddingVertical: Spacing.two,
    borderWidth: 2,
  },
  triggeredTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  endedTitle: {
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  endedBody: {
    textAlign: 'center',
  },
  flexOne: {
    flex: 1,
  },
  footnote: {
    fontSize: 11,
    lineHeight: 15,
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
  },
  action: {
    flex: 1,
  },
});
