import { useNetInfo } from '@react-native-community/netinfo';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, Pressable, StyleSheet, View } from 'react-native';

import { JourneyStatusCard } from '@/components/home/journey-status-card';
import { NextStopCard } from '@/components/home/next-stop-card';
import { RecentList } from '@/components/home/recent-list';
import { ReadinessCard } from '@/components/home/readiness-card';
import { SavedPlaces } from '@/components/home/saved-places';
import { UpdateCard } from '@/components/home/update-card';
import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Row, Stack } from '@/components/ui/layout';
import { Mascot } from '@/components/ui/mascot';
import { useResolvedScheme } from '@/hooks/use-appearance';
import { useSettings } from '@/hooks/use-settings';
import { useAppearance } from '@/modules/settings/appearance';
import { AppButton, Card, SectionLabel } from '@/components/ui/controls';
import { confirmAction } from '@/components/ui/confirm';
import { ResetStorageDialog } from '@/components/ui/reset-dialog';
import { Screen } from '@/components/ui/screen';
import { strings } from '@/constants/strings';
import { Radii, Spacing } from '@/constants/theme';
import { getDatabase, resetStorage, retryStorage } from '@/db/client';
import { haversineMeters } from '@/modules/geofence/distance';
import { useActiveJourney } from '@/hooks/use-active-journey';
import { useTheme } from '@/hooks/use-theme';
import { usePlaces } from '@/hooks/use-places';
import { useStorage } from '@/hooks/use-storage';
import { useTracking } from '@/hooks/use-tracking';
import { useUpdateCheck } from '@/hooks/use-update-check';
import { DEFAULT_SETTINGS } from '@/modules/settings/schema';
import type { Journey } from '@/modules/journeys';
import { listJourneys, listRecentDestinations } from '@/modules/journeys/repository';
import { currentVersion } from '@/modules/updates';
import {
  endJourneySession,
  pauseJourneySession,
  resumeJourneySession,
} from '@/modules/location/session';
import type { ReadinessIssue } from '@/modules/permissions';
import { getReadinessIssues } from '@/modules/permissions/service';
import type { RecentDestination } from '@/modules/places';
import { journeySetupParams, openJourneyResult } from '@/utils/navigation';

export default function HomeScreen() {
  const router = useRouter();
  const { update: updateSettings } = useSettings();
  const scheme = useResolvedScheme();
  const setAppearance = useAppearance((state) => state.setPreference);

  const toggleTheme = () => {
    const next = scheme === 'dark' ? 'light' : 'dark';
    setAppearance(next);
    void updateSettings({ appearance: next });
  };
  const net = useNetInfo();
  const active = useActiveJourney();
  const tracking = useTracking();
  const storage = useStorage();
  const { places } = usePlaces();
  const theme = useTheme();
  const updates = useUpdateCheck();

  const journey = active.data?.journey ?? null;
  const settings = active.data?.settings ?? DEFAULT_SETTINGS;
  const unit = settings.distance_unit;

  const hour = new Date().getHours();
  const greeting =
    hour >= 5 && hour < 12
      ? strings.home.greetingMorning
      : hour >= 12 && hour < 18
        ? strings.home.greetingAfternoon
        : strings.home.greetingEvening;

  // Favourite wins; otherwise the closest place to the last fix, then the first.
  const nextPlace = useMemo(() => {
    if (places.length === 0) return null;
    const favourite = places.find((place) => place.isFavorite);
    if (favourite) return favourite;
    const sample = tracking.lastSample;
    if (!sample) return places[0];
    return [...places].sort(
      (a, b) => haversineMeters(sample, a) - haversineMeters(sample, b),
    )[0];
  }, [places, tracking.lastSample]);

  const nextDistanceM =
    nextPlace && tracking.lastSample ? haversineMeters(tracking.lastSample, nextPlace) : null;

  const [issues, setIssues] = useState<ReadinessIssue[]>([]);
  const [recent, setRecent] = useState<RecentDestination[]>([]);
  const [interrupted, setInterrupted] = useState<Journey | null>(null);
  const [resetVisible, setResetVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  const loadSide = useCallback(async () => {
    const [nextIssues, db] = await Promise.all([getReadinessIssues(), getDatabase()]);
    const [recentRows, interruptedRows] = await Promise.all([
      listRecentDestinations(db, 5),
      listJourneys(db, { statuses: ['interrupted'], limit: 5 }),
    ]);
    // Only offer the recovery prompt for an interruption the user can still act on.
    const recentInterruption =
      interruptedRows.find(
        (candidate) =>
          candidate.endedAt !== null && Date.now() - candidate.endedAt < 12 * 60 * 60_000,
      ) ?? null;
    return {
      issues: nextIssues,
      recent: recentRows,
      interrupted: recentInterruption,
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void loadSide()
      .then((side) => {
        if (cancelled) return;
        setIssues(side.issues);
        setRecent(side.recent);
        setInterrupted(side.interrupted);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [loadSide, journey?.id, journey?.status]);

  const refreshSide = useCallback(() => {
    void loadSide()
      .then((side) => {
        setIssues(side.issues);
        setRecent(side.recent);
        setInterrupted(side.interrupted);
      })
      .catch(() => undefined);
  }, [loadSide]);

  useFocusEffect(
    useCallback(() => {
      refreshSide();
    }, [refreshSide]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        refreshSide();
      }
    });
    return () => sub.remove();
  }, [refreshSide]);

  const distanceM = tracking.lastKnownDistanceM ?? journey?.lastKnownDistanceM ?? null;
  const offline = net.isConnected === false;
  const statusNote =
    !journey && places.length > 0
      ? offline
        ? strings.home.guideOfflineBody
        : tracking.status === 'waiting' || tracking.status === 'stale'
          ? strings.home.guideFixBody
          : null
      : null;
  const gpsDown = tracking.gpsAvailable === false;

  const openSetup = (destination: RecentDestination | (typeof places)[number], radiusM: number) => {
    router.push({
      pathname: '/journey/new',
      params: journeySetupParams(
        {
          name: destination.name,
          latitude: destination.latitude,
          longitude: destination.longitude,
          placeId: 'placeId' in destination ? destination.placeId : destination.id,
        },
        radiusM,
      ),
    });
  };

  const run = async (action: () => Promise<unknown>) => {
    setBusy(true);
    try {
      await action();
      active.reload();
      refreshSide();
    } catch (error) {
      confirmAction({
        title: strings.readiness.title,
        body: error instanceof Error ? error.message : strings.common.errorBody,
        confirmLabel: strings.common.done,
        onConfirm: () => undefined,
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      logo
      tabInset
      headerContent={
        <Stack gap="one">
          <Row between gap="two" style={styles.greetingRow}>
            <ThemedText style={styles.greeting}>{greeting}</ThemedText>
            {statusNote ? null : <Mascot pose="navigator" height={64} />}
          </Row>

          {statusNote ? (
            <Row gap="two" pt="one">
              <Mascot pose="alert" height={36} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.statusText}>
                {statusNote}
              </ThemedText>
            </Row>
          ) : null}
        </Stack>
      }
      right={
        <Pressable
          onPress={toggleTheme}
          accessibilityRole="button"
          accessibilityLabel={strings.settings.theme}
          hitSlop={12}
          style={[styles.gearButton, { backgroundColor: theme.accentSoft }]}>
          <Icon name={scheme === 'dark' ? 'sunny-outline' : 'moon-outline'} size={20} color={theme.accent} />
        </Pressable>
      }>
      {nextPlace && !journey ? (
        <NextStopCard
          place={nextPlace}
          distanceM={nextDistanceM}
          unit={unit}
          onStart={() => openSetup(nextPlace, nextPlace.defaultRadiusM)}
        />
      ) : null}

      {places.length === 0 && !journey ? (
        <Stack
          center
          gap="two"
          p="three"
          style={[styles.heroFrame, { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder }]}>
          <Mascot pose="friendly" height={152} />
          <ThemedText style={styles.heroTitle}>{strings.home.guideEmptyTitle}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.heroBody}>
            {strings.home.guideEmptyBody}
          </ThemedText>
          <Row gap="two" pt="one" style={styles.heroActions}>
            <AppButton
              label={strings.places.addPlace}
              onPress={() =>
                router.push({ pathname: '/destination/pin', params: { intent: 'save' } })
              }
              style={styles.heroAction}
            />
            <AppButton
              label={strings.home.dropPin}
              variant="secondary"
              onPress={() =>
                router.push({ pathname: '/destination/pin', params: { intent: 'journey' } })
              }
              style={styles.heroAction}
            />
          </Row>
        </Stack>
      ) : journey ? (
        <Pressable
          accessibilityRole="search"
          onPress={() => router.push('/destination/search')}
          style={({ pressed }) => [
            styles.searchCompactFrame,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            pressed && { opacity: 0.85 },
          ]}>
          <Row gap="two" px="three">
            <Icon name="search" size={16} color={theme.accent} />
            <ThemedText type="small" style={[styles.searchText, { color: theme.textSecondary }]}>
              {strings.home.searchPlaceholder}
            </ThemedText>
            <Icon name="chevron-forward" size={16} themeColor="textSecondary" />
          </Row>
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="search"
          onPress={() => router.push('/destination/search')}
          style={({ pressed }) => [
            styles.searchFrame,
            { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder },
            pressed && { opacity: 0.85 },
          ]}>
          <Row gap="two" px="three" py="three">
            <View style={[styles.searchBadge, { backgroundColor: theme.accent }]}>
              <Icon name="search" size={18} color={theme.accentText} />
            </View>
            <Stack gap="half" flex>
              <ThemedText style={styles.searchTitle}>{strings.home.searchPlaceholder}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {strings.home.searchHint}
              </ThemedText>
            </Stack>
            <Icon name="chevron-forward" size={22} color={theme.accent} />
          </Row>
        </Pressable>
      )}

      {updates.release ? (
        <UpdateCard
          release={updates.release}
          current={currentVersion()}
          onOpen={updates.open}
          onDismiss={() => void updates.dismiss()}
        />
      ) : null}

      {storage.state === 'unavailable' ? (
        <Card style={styles.strip}>
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
        </Card>
      ) : null}

      {!journey ? (
        <ReadinessCard
          issues={issues}
          restrictionSuspected={tracking.restrictionSuspected}
          onFix={() => router.push('/settings/permissions')}
        />
      ) : null}

      {journey && journey.status !== 'interrupted' ? (
        <JourneyStatusCard
          journey={journey}
          status={tracking.status}
          lastSampleAt={tracking.lastSampleAt}
          distanceM={distanceM}
          unit={unit}
          busy={busy}
          onPauseResume={() =>
            run(() =>
              journey.status === 'paused'
                ? resumeJourneySession(journey.id)
                : pauseJourneySession(journey.id),
            )
          }
          onEnd={() =>
            confirmAction({
              title: strings.journey.endConfirmTitle,
              body: strings.journey.endConfirmBody,
              confirmLabel: strings.home.end,
              destructive: true,
              // Ending by hand stops the trip short; only the alarm completing
              // counts as having arrived.
              onConfirm: () => void run(() => endJourneySession(journey.id, 'cancelled')),
            })
          }
          onOpen={() => router.push({ pathname: '/journey/[id]', params: { id: journey.id } })}
        />
      ) : null}

      {!journey && interrupted ? (
        <Card style={styles.strip}>
          <Row gap="two">
            <Mascot pose="alert" height={64} />
            <ThemedText type="small" style={styles.interruptedText}>
              {strings.home.interruptNote}
            </ThemedText>
          </Row>
          <AppButton
            label={strings.journey.viewSummary}
            variant="secondary"
            onPress={() => openJourneyResult(router, interrupted.id)}
          />
        </Card>
      ) : null}

      {places.length > 0 ? (
        <SectionLabel
          right={
            <Pressable onPress={() => router.push('/places')}>
              <ThemedText type="small" themeColor="textSecondary">
                {strings.home.seeAll}
              </ThemedText>
            </Pressable>
          }>
          {strings.home.savedHeading}
        </SectionLabel>
      ) : null}

      {places.length > 0 ? (
        <SavedPlaces
          places={places}
          unit={unit}
          onOpen={(place) => router.push({ pathname: '/place/[id]', params: { id: place.id } })}
          onAdd={() => router.push({ pathname: '/destination/pin', params: { intent: 'save' } })}
        />
      ) : null}

      <RecentList recent={recent} onOpen={(item) => openSetup(item, settings.default_radius_m)} />

      {offline || gpsDown ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.footerNote}>
          {offline
            ? strings.home.offlineNote
            : strings.permissions.locationServices}
        </ThemedText>
      ) : null}

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
  greetingRow: {
    minHeight: 64,
  },
  greeting: {
    flexShrink: 1,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
  },

  heroFrame: {
    borderRadius: Radii.large,
    borderWidth: StyleSheet.hairlineWidth,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroBody: {
    textAlign: 'center',
    paddingHorizontal: Spacing.three,
  },
  heroActions: {
    alignSelf: 'stretch',
  },
  heroAction: {
    flex: 1,
  },
  searchCompactFrame: {
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: Radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusText: {
    flex: 1,
  },
  gearButton: {
    width: 40,
    height: 40,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gear: {
    fontSize: 20,
  },
  searchFrame: {
    borderRadius: Radii.large,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  searchBadge: {
    width: 40,
    height: 40,
    borderRadius: Radii.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchText: {
    flex: 1,
  },
  searchTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  strip: {
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  interruptedText: {
    flex: 1,
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
    flex: 1,
  },
  footerNote: {
    textAlign: 'center',
    paddingTop: Spacing.two,
  },
});
