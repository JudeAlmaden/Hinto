import { useNetInfo } from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton, Card, SectionLabel } from '@/components/ui/controls';
import { confirmAction } from '@/components/ui/confirm';
import { ResetStorageDialog } from '@/components/ui/reset-dialog';
import { PlaceCard } from '@/components/ui/place';
import { Screen } from '@/components/ui/screen';
import { StatusPill } from '@/components/ui/status-pill';
import { formatCopy, strings } from '@/constants/strings';
import { Radii, Spacing } from '@/constants/theme';
import { getDatabase, resetStorage, retryStorage } from '@/db/client';
import { useActiveJourney } from '@/hooks/use-active-journey';
import { usePlaces } from '@/hooks/use-places';
import { useStorage } from '@/hooks/use-storage';
import { useTracking } from '@/hooks/use-tracking';
import { DEFAULT_SETTINGS } from '@/modules/settings/schema';
import type { Journey } from '@/modules/journeys';
import { listJourneys, listRecentDestinations } from '@/modules/journeys/repository';
import { endJourneySession, pauseJourneySession, resumeJourneySession } from '@/modules/location/session';
import type { ReadinessIssue } from '@/modules/permissions';
import { getReadinessIssues } from '@/modules/permissions/service';
import type { RecentDestination } from '@/modules/places';
import { formatDistance, formatAge } from '@/utils/format';
import { journeySetupParams } from '@/utils/navigation';
import { progressToRadius } from '@/utils/progress';

export default function HomeScreen() {
  const router = useRouter();
  const net = useNetInfo();
  const active = useActiveJourney();
  const tracking = useTracking();
  const storage = useStorage();
  const { places } = usePlaces();

  const journey = active.data?.journey ?? null;
  const settings = active.data?.settings ?? DEFAULT_SETTINGS;
  const unit = settings.distance_unit;

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

  const refreshSide = () => {
    void loadSide()
      .then((side) => {
        setIssues(side.issues);
        setRecent(side.recent);
        setInterrupted(side.interrupted);
      })
      .catch(() => undefined);
  };

  const distanceM = tracking.lastKnownDistanceM ?? journey?.lastKnownDistanceM ?? null;
  const blocking = issues.filter((issue) => issue.severity === 'blocking');
  const warnings = issues.filter((issue) => issue.severity === 'warning');
  const offline = net.isConnected === false;
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
      title={strings.appName}
      subtitle={strings.tagline}
      tabInset
      right={
        <Pressable onPress={() => router.push('/settings')} hitSlop={12}>
          <ThemedText style={styles.gear}>⚙</ThemedText>
        </Pressable>
      }>
      <Pressable
        accessibilityRole="search"
        onPress={() => router.push('/destination/search')}
        style={({ pressed }) => [styles.search, pressed && { opacity: 0.7 }]}>
        <ThemedView type="backgroundElement" style={styles.searchInner}>
          <ThemedText type="small" themeColor="textSecondary">
            🔍
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {strings.home.searchPlaceholder}
          </ThemedText>
        </ThemedView>
      </Pressable>

      {storage.state === 'unavailable' ? (
        <Card style={styles.strip}>
          <ThemedText type="small">{strings.diagnostics.storageUnavailable}</ThemedText>
          <View style={styles.actions}>
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
          </View>
        </Card>
      ) : null}

      {blocking.length > 0 ? (
        <Card style={styles.strip}>
          <ThemedText type="small">
            {blocking[0].key === 'locationServices'
              ? strings.home.locationsOff
              : blocking[0].message}
          </ThemedText>
          <AppButton
            label={strings.home.fix}
            variant="secondary"
            onPress={() => router.push('/settings/permissions')}
          />
        </Card>
      ) : null}

      {tracking.restrictionSuspected ? (
        <Card style={styles.strip}>
          <ThemedText type="small" style={styles.warningText}>
            {strings.home.batteryHint}
          </ThemedText>
        </Card>
      ) : null}

      {warnings.length > 0 && blocking.length === 0 ? (
        <Card style={styles.strip}>
          <ThemedText type="small" themeColor="textSecondary">
            {warnings[0].message}
          </ThemedText>
        </Card>
      ) : null}

      {journey && journey.status !== 'interrupted' ? (
        <Card style={styles.journeyCard}>
          <View style={styles.journeyHeader}>
            <StatusPill status={tracking.status} />
            <ThemedText type="small" themeColor="textSecondary">
              {strings.journey.alertAt} {formatDistance(journey.radiusM, unit)}
            </ThemedText>
          </View>

          <ThemedText style={styles.destination} numberOfLines={2}>
            {journey.destinationName}
          </ThemedText>

          <View style={styles.stats}>
            <View style={styles.stat}>
              <ThemedText style={styles.statValue}>{formatDistance(distanceM, unit)}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {strings.journey.toGo}
              </ThemedText>
            </View>
            <View style={styles.stat}>
              <ThemedText style={styles.statValue}>
                {tracking.accuracyM === null ? strings.common.notAvailable : `±${Math.round(tracking.accuracyM)} m`}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {strings.journey.accuracy}
              </ThemedText>
            </View>
          </View>

          <View style={styles.progressBlock}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.round(progressToRadius(distanceM, journey.radiusM) * 100)}%` },
                ]}
              />
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {formatCopy(strings.journey.lastSeen, { age: formatAge(tracking.lastSampleAt) })}
            </ThemedText>
          </View>

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
                  onConfirm: () => void run(() => endJourneySession(journey.id, 'completed')),
                })
              }
              style={styles.action}
            />
          </View>

          <Pressable
            onPress={() => router.push({ pathname: '/journey/[id]', params: { id: journey.id } })}>
            <ThemedText type="small" themeColor="textSecondary">
              {strings.journey.title} ›
            </ThemedText>
          </Pressable>
        </Card>
      ) : null}

      {!journey && interrupted ? (
        <Card style={styles.strip}>
          <ThemedText type="small">{strings.home.resumed}</ThemedText>
          <View style={styles.actions}>
            <AppButton
              label={strings.home.resume}
              onPress={() => run(() => resumeJourneySession(interrupted.id))}
              disabled={busy}
              style={styles.action}
            />
            <AppButton
              label={strings.home.end}
              variant="ghost"
              onPress={() => run(() => endJourneySession(interrupted.id, 'completed'))}
              disabled={busy}
              style={styles.action}
            />
          </View>
        </Card>
      ) : null}

      {journey ? (
        <ThemedText type="small" themeColor="textSecondary">
          {strings.home.startAnother}
        </ThemedText>
      ) : null}

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

      {places.length === 0 ? (
        <Card style={styles.strip}>
          <ThemedText type="small" themeColor="textSecondary">
            {strings.places.emptyBody}
          </ThemedText>
          <AppButton
            label={strings.places.addPlace}
            variant="secondary"
            onPress={() => router.push('/place/new')}
          />
        </Card>
      ) : (
        <View style={styles.savedList}>
          {places.slice(0, 4).map((place) => (
            <PlaceCard
              key={place.id}
              place={place}
              unit={unit}
              showCategory={false}
              onPress={() => openSetup(place, place.defaultRadiusM)}
            />
          ))}
        </View>
      )}

      {recent.length > 0 ? (
        <>
          <SectionLabel>{strings.home.recentHeading}</SectionLabel>
          {recent.map((item) => (
            <Pressable
              key={`${item.name}-${item.latitude}`}
              onPress={() => openSetup(item, settings.default_radius_m)}
              style={({ pressed }) => [styles.recentRow, pressed && { opacity: 0.6 }]}>
              <ThemedText style={styles.recentName} numberOfLines={1}>
                {item.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatAge(item.lastUsedAt)} ›
              </ThemedText>
            </Pressable>
          ))}
        </>
      ) : null}

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
  gear: {
    fontSize: 22,
  },
  search: {
    borderRadius: Radii.large,
  },
  searchInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.large,
  },
  strip: {
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  warningText: {
    color: '#F5A623',
  },
  journeyCard: {
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  journeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  destination: {
    fontSize: 20,
    fontWeight: '700',
  },
  stats: {
    flexDirection: 'row',
  },
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 26,
    fontWeight: '700',
  },
  progressBlock: {
    gap: Spacing.one,
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
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
    flex: 1,
  },
  savedList: {
    gap: Spacing.half,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  recentName: {
    flex: 1,
    fontSize: 16,
  },
  footerNote: {
    textAlign: 'center',
    paddingTop: Spacing.two,
  },
});
