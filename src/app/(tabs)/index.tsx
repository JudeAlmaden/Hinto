import { useNetInfo } from '@react-native-community/netinfo';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { Mascot } from '@/components/ui/mascot';
import { useResolvedScheme } from '@/hooks/use-appearance';
import { useSettings } from '@/hooks/use-settings';
import { useAppearance } from '@/modules/settings/appearance';
import { AppButton, Card, SectionLabel } from '@/components/ui/controls';
import { confirmAction } from '@/components/ui/confirm';
import { ResetStorageDialog } from '@/components/ui/reset-dialog';
import { PlaceIcon } from '@/components/ui/place';
import { Screen } from '@/components/ui/screen';
import { StatusPill } from '@/components/ui/status-pill';
import { formatCopy, strings } from '@/constants/strings';
import { Radii, Spacing } from '@/constants/theme';
import { getDatabase, resetStorage, retryStorage } from '@/db/client';
import { haversineMeters } from '@/modules/geofence/distance';
import { useActiveJourney } from '@/hooks/use-active-journey';
import { useTheme } from '@/hooks/use-theme';
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
        <View style={styles.greetingBlock}>
          <View style={styles.greetingRow}>
            <ThemedText style={styles.greeting}>{greeting}</ThemedText>
            {statusNote ? null : <Mascot pose="navigator" height={64} />}
          </View>

          {statusNote ? (
            <View style={styles.statusLine}>
              <Mascot pose="alert" height={36} />
              <ThemedText type="small" themeColor="textSecondary" style={styles.statusText}>
                {statusNote}
              </ThemedText>
            </View>
          ) : null}
        </View>
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
        <Card style={[styles.nextCard, { borderColor: theme.accentBorder }]}>
          <View style={styles.nextCardRow}>
            <PlaceIcon
              category={nextPlace.category}
              icon={nextPlace.icon}
              color={nextPlace.color}
              size={56}
            />
            <View style={styles.nextText}>
              <ThemedText style={styles.nextCardName} numberOfLines={2}>
                {nextPlace.name}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {strings.place.categories[nextPlace.category]}
                {nextDistanceM !== null
                  ? ` · ${formatDistance(nextDistanceM, unit)} ${strings.journey.toGo}`
                  : ` · ${strings.home.alarmAt} ${formatDistance(nextPlace.defaultRadiusM, unit)}`}
              </ThemedText>
            </View>
          </View>
          <AppButton
            label={strings.home.startJourney}
            onPress={() => openSetup(nextPlace, nextPlace.defaultRadiusM)}
          />
        </Card>
      ) : null}

      {places.length === 0 && !journey ? (
        <View
          style={[
            styles.hero,
            { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder },
          ]}>
          <Mascot pose="friendly" height={152} />
          <ThemedText style={styles.heroTitle}>{strings.home.guideEmptyTitle}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.heroBody}>
            {strings.home.guideEmptyBody}
          </ThemedText>
          <View style={styles.heroActions}>
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
          </View>
        </View>
      ) : journey ? (
        <Pressable
          accessibilityRole="search"
          onPress={() => router.push('/destination/search')}
          style={({ pressed }) => [
            styles.searchCompact,
            { backgroundColor: theme.backgroundElement, borderColor: theme.border },
            pressed && { opacity: 0.85 },
          ]}>
          <Icon name="search" size={16} color={theme.accent} />
          <ThemedText type="small" style={{ flex: 1, color: theme.textSecondary }}>
            {strings.home.searchPlaceholder}
          </ThemedText>
          <Icon name="chevron-forward" size={16} themeColor="textSecondary" />
        </Pressable>
      ) : (
        <Pressable
          accessibilityRole="search"
          onPress={() => router.push('/destination/search')}
          style={({ pressed }) => [
            styles.search,
            { backgroundColor: theme.accentSoft, borderColor: theme.accentBorder },
            pressed && { opacity: 0.85 },
          ]}>
          <View style={[styles.searchBadge, { backgroundColor: theme.accent }]}>
            <Icon name="search" size={18} color={theme.accentText} />
          </View>
          <View style={styles.searchText}>
            <ThemedText style={styles.searchTitle}>{strings.home.searchPlaceholder}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {strings.home.searchHint}
            </ThemedText>
          </View>
          <Icon name="chevron-forward" size={22} color={theme.accent} />
        </Pressable>
      )}

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

      {!journey ? (
        <Card style={styles.readiness}>
          <View style={styles.readinessHead}>
            <Icon
              name={issues.length === 0 ? 'checkmark-circle' : 'alert-circle'}
              size={18}
              color={issues.length === 0 ? theme.success : theme.warning}
            />
            <ThemedText style={styles.readinessTitle}>
              {issues.length === 0 ? strings.home.readinessReady : strings.home.readinessNeeds}
            </ThemedText>
          </View>
          {issues.length === 0 && !tracking.restrictionSuspected ? (
            <ThemedText type="small" themeColor="textSecondary">
              {strings.home.readinessBody}
            </ThemedText>
          ) : null}
          {issues.slice(0, 3).map((issue) => (
            <Pressable
              key={issue.key}
              accessibilityRole="button"
              onPress={() => router.push('/settings/permissions')}
              style={({ pressed }) => [styles.readinessRow, pressed && { opacity: 0.6 }]}>
              <ThemedText
                type="small"
                style={[
                  styles.readinessMessage,
                  { color: issue.severity === 'blocking' ? theme.text : theme.textSecondary },
                ]}>
                {issue.key === 'locationServices' ? strings.home.locationsOff : issue.message}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.accent }}>
                {strings.home.fix}
              </ThemedText>
            </Pressable>
          ))}
          {tracking.restrictionSuspected ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push('/settings/permissions')}
              style={({ pressed }) => [styles.readinessRow, pressed && { opacity: 0.6 }]}>
              <ThemedText type="small" style={[styles.readinessMessage, { color: theme.warning }]}>
                {strings.home.batteryHint}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.accent }}>
                {strings.home.fix}
              </ThemedText>
            </Pressable>
          ) : null}
        </Card>
      ) : null}

      {journey && journey.status !== 'interrupted' ? (
        <Card
          style={[
            styles.journeyCard,
            {
              backgroundColor: theme.accentSoft,
              borderColor: theme.accentBorder,
              borderWidth: StyleSheet.hairlineWidth * 2,
            },
          ]}>
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
              <ThemedText style={[styles.statValue, { color: theme.accent }]}>
                {formatDistance(distanceM, unit)}
              </ThemedText>
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
          <View style={styles.interruptedRow}>
            <Mascot pose="alert" height={76} />
            <ThemedText type="small" style={styles.interruptedText}>
              {strings.home.resumed}
            </ThemedText>
          </View>
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
        <View style={styles.tiles}>
          {places.slice(0, 3).map((place) => (
              <Pressable
                key={place.id}
                accessibilityRole="button"
                onPress={() => openSetup(place, place.defaultRadiusM)}
                style={({ pressed }) => [
                  styles.tile,
                  { backgroundColor: theme.backgroundElement, borderColor: theme.border },
                  pressed && { opacity: 0.7 },
                ]}>
                <PlaceIcon
                  category={place.category}
                  icon={place.icon}
                  color={place.color}
                  size={40}
                />
                <ThemedText style={styles.tileName} numberOfLines={2}>
                  {place.name}
                </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {strings.place.categories[place.category]} ·{' '}
                {formatDistance(place.defaultRadiusM, unit)}
              </ThemedText>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: '/destination/pin', params: { intent: 'save' } })}
            style={({ pressed }) => [
              styles.tile,
              styles.tileAdd,
              { borderColor: theme.border },
              pressed && { opacity: 0.7 },
            ]}>
            <View style={[styles.tileAddIcon, { backgroundColor: theme.accentSoft }]}>
              <Icon name="add" size={20} color={theme.accent} />
            </View>
            <ThemedText style={styles.tileName}>{strings.home.addTile}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {strings.home.addTileHint}
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      {recent.length > 0 ? (
        <>
          <SectionLabel>{strings.home.recentHeading}</SectionLabel>
          {recent.map((item) => (
            <Pressable
              key={`${item.name}-${item.latitude}`}
              onPress={() => openSetup(item, settings.default_radius_m)}
              style={({ pressed }) => [styles.recentRow, pressed && { opacity: 0.6 }]}>
              <View style={[styles.recentIcon, { backgroundColor: theme.backgroundElement }]}>
                <Icon name="time-outline" size={16} themeColor="textSecondary" />
              </View>
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
  greetingBlock: {
    gap: Spacing.one,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    minHeight: 64,
  },
  greeting: {
    flexShrink: 1,
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700',
  },
  nextCard: {
    gap: Spacing.three,
    paddingVertical: Spacing.three,
  },

  nextCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  nextCardName: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '700',
  },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.one,
  },
  nextText: {
    flex: 1,
    gap: 2,
  },
  nextName: {
    fontSize: 16,
    fontWeight: '600',
  },
  hero: {
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: Radii.large,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
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
    flexDirection: 'row',
    gap: Spacing.two,
    alignSelf: 'stretch',
    paddingTop: Spacing.one,
  },
  heroAction: {
    flex: 1,
  },
  searchCompact: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Radii.pill,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingTop: Spacing.one,
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
  search: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.three,
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
  searchBadgeGlyph: {
    fontSize: 22,
    lineHeight: 26,
  },
  searchText: {
    flex: 1,
    gap: 2,
  },
  searchTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  searchChevron: {
    fontSize: 26,
    lineHeight: 28,
  },
  emptyCard: {
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.three,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  emptyGlyph: {
    fontSize: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyBody: {
    textAlign: 'center',
  },
  emptyAction: {
    alignSelf: 'stretch',
    marginTop: Spacing.two,
  },
  tiles: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    alignItems: 'flex-start',
    gap: Spacing.two,
    minHeight: 128,
    padding: Spacing.two + 4,
    borderRadius: Radii.large,
    borderWidth: StyleSheet.hairlineWidth * 2,
  },
  tileAdd: {
    borderStyle: 'dashed',
    borderWidth: 1,
    justifyContent: 'flex-start',
  },
  tileAddIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tileName: {
    fontSize: 15,
    fontWeight: '700',
  },
  readiness: {
    gap: Spacing.one,
    paddingVertical: Spacing.three,
  },
  strip: {
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  readinessHead: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingBottom: 2,
  },
  readinessTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  readinessRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.one,
  },
  readinessMessage: {
    flex: 1,
  },
  warningText: {
    fontSize: 14,
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
  destinationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  interruptedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  interruptedText: {
    flex: 1,
  },
  destination: {
    flex: 1,
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
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  action: {
    flex: 1,
  },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.two,
    paddingVertical: Spacing.two,
  },
  recentIcon: {
    width: 32,
    height: 32,
    borderRadius: Radii.small,
    alignItems: 'center',
    justifyContent: 'center',
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
