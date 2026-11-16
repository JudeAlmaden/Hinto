import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { PlaceForm, type PlaceFormHandle, type PlaceFormStatus } from '@/components/place-form';
import { AppButton, Card, NavRow, StatBlock } from '@/components/ui/controls';
import { confirmAction } from '@/components/ui/confirm';
import { Icon } from '@/components/ui/icon';
import { Row, Stack } from '@/components/ui/layout';
import { MoreMenu } from '@/components/ui/more-menu';
import { PlaceIcon } from '@/components/ui/place';
import { Screen } from '@/components/ui/screen';
import { formatCopy, strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { getDatabase } from '@/db/client';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import type { Journey } from '@/modules/journeys';
import { listJourneys } from '@/modules/journeys/repository';
import { usePlacesStore } from '@/modules/places/store';
import { formatAge, formatCoordinates, formatDateTime, formatDistance, formatDuration } from '@/utils/format';
import { journeySetupParams } from '@/utils/navigation';

const IDLE_FORM: PlaceFormStatus = { canSave: false, saving: false, dirty: false };

export default function PlaceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; saved?: string }>();
  const id = typeof params.id === 'string' ? params.id : '';
  const justSaved = params.saved === '1';

  const places = usePlacesStore((state) => state.places);
  const load = usePlacesStore((state) => state.load);
  const remove = usePlacesStore((state) => state.remove);
  const { settings } = useSettings();
  const theme = useTheme();
  const unit = settings.distance_unit;

  const place = places.find((candidate) => candidate.id === id) ?? null;

  const [editing, setEditing] = useState(false);
  const [formStatus, setFormStatus] = useState<PlaceFormStatus>(IDLE_FORM);
  const formRef = useRef<PlaceFormHandle>(null);
  const [trips, setTrips] = useState<Journey[]>([]);
  const [showAllTrips, setShowAllTrips] = useState(false);

  useEffect(() => {
    void load();
  }, [load]);

  // Trips attach by place_id at creation, so the record survives edits to the
  // place itself; a deleted place simply stops collecting new ones.
  useEffect(() => {
    if (!id) return;
    let active = true;
    void getDatabase()
      .then((db) =>
        listJourneys(db, {
          placeId: id,
          statuses: ['completed', 'interrupted', 'cancelled'],
          limit: 50,
        }),
      )
      .then((rows) => {
        if (active) setTrips(rows);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [id, justSaved]);

  const handleFormStatus = useCallback((next: PlaceFormStatus) => {
    setFormStatus((previous) =>
      previous.canSave === next.canSave &&
      previous.saving === next.saving &&
      previous.dirty === next.dirty
        ? previous
        : next,
    );
  }, []);

  if (!place) {
    return (
      <Screen title={strings.place.editTitle} back>
        <ThemedText type="small" themeColor="textSecondary">
          {strings.common.loading}
        </ThemedText>
      </Screen>
    );
  }

  const startJourney = () => {
    router.push({
      pathname: '/journey/new',
      params: journeySetupParams(
        {
          name: place.name,
          latitude: place.latitude,
          longitude: place.longitude,
          placeId: place.id,
        },
        place.defaultRadiusM,
      ),
    });
  };

  const leaveEdit = () => {
    if (!formStatus.dirty) {
      setEditing(false);
      return;
    }
    confirmAction({
      title: strings.place.discardTitle,
      body: strings.place.discardBody,
      confirmLabel: strings.place.discardConfirm,
      destructive: true,
      onConfirm: () => setEditing(false),
    });
  };

  const confirmDelete = () =>
    confirmAction({
      title: formatCopy(strings.place.deleteTitle, { name: place.name }),
      body: strings.place.deleteBody,
      confirmLabel: strings.place.delete,
      destructive: true,
      onConfirm: () => {
        void remove(place.id).then(() => router.back());
      },
    });

  const durations = trips
    .map((trip) => (trip.startedAt !== null && trip.endedAt !== null ? trip.endedAt - trip.startedAt : null))
    .filter((value): value is number => value !== null);
  const averageMs =
    durations.length > 0 ? durations.reduce((total, value) => total + value, 0) / durations.length : null;
  const lastAt = trips[0]?.endedAt ?? trips[0]?.startedAt ?? trips[0]?.createdAt ?? null;

  const tripsCard = (
    <Card style={styles.tripsCard}>
      <View style={styles.tripsHead}>
        <ThemedText style={styles.tripsTitle}>{strings.place.tripsTitle}</ThemedText>
        {trips.length > 0 ? (
          <ThemedText type="small" themeColor="textSecondary">
            {formatCopy(strings.history.summary, { count: trips.length })}
          </ThemedText>
        ) : null}
      </View>
      {trips.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {strings.place.tripsEmpty}
        </ThemedText>
      ) : (
        <>
          <Row gap="two">
            <StatBlock label={strings.place.tripsCount} value={String(trips.length)} />
            <StatBlock
              label={strings.place.tripsAverage}
              value={averageMs === null ? '—' : formatDuration(averageMs)}
            />
            <StatBlock label={strings.place.tripsLast} value={lastAt === null ? '—' : formatAge(lastAt)} />
          </Row>
          {(showAllTrips ? trips : trips.slice(0, 3)).map((trip, index, visible) => (
            <NavRow
              key={trip.id}
              label={formatDateTime(trip.createdAt)}
              value={
                trip.status === 'completed'
                  ? strings.history.completed
                  : trip.status === 'interrupted'
                    ? strings.history.interrupted
                    : strings.history.cancelled
              }
              last={index === visible.length - 1}
              onPress={() => router.push({ pathname: '/history/[id]', params: { id: trip.id } })}
            />
          ))}
          {trips.length > 3 ? (
            <AppButton
              label={
                showAllTrips
                  ? strings.place.tripsShowRecent
                  : formatCopy(strings.place.tripsViewAll, { count: trips.length })
              }
              variant="ghost"
              onPress={() => setShowAllTrips((current) => !current)}
            />
          ) : null}
        </>
      )}
    </Card>
  );

  return (
    <Screen
      title={editing ? strings.place.editTitle : place.name}
      back
      onBack={editing ? leaveEdit : undefined}
      right={
        <MoreMenu
          items={[
            ...(editing
              ? []
              : [
                  {
                    label: strings.place.editAction,
                    icon: 'create-outline' as const,
                    onPress: () => setEditing(true),
                  },
                ]),
            { label: strings.place.delete, icon: 'trash-outline', destructive: true, onPress: confirmDelete },
          ]}
        />
      }
      footer={
        <Row gap="two">
          {editing ? (
            <>
              <AppButton
                label={strings.common.cancel}
                variant="secondary"
                onPress={leaveEdit}
                style={styles.footerAction}
              />
              <AppButton
                label={formStatus.dirty ? strings.place.save : strings.place.savedLabel}
                onPress={() => formRef.current?.save()}
                disabled={!formStatus.canSave || formStatus.saving || !formStatus.dirty}
                loading={formStatus.saving}
                style={styles.footerAction}
              />
            </>
          ) : (
            <AppButton
              label={strings.places.startJourney}
              onPress={startJourney}
              style={styles.footerAction}
            />
          )}
        </Row>
      }>
      {justSaved && !editing ? (
        <Card style={styles.savedBanner}>
          <ThemedText type="smallBold">{strings.place.savedBanner}</ThemedText>
        </Card>
      ) : null}

      {editing ? (
        <PlaceForm
          ref={formRef}
          initial={place}
          onSaved={() => setEditing(false)}
          hideActions
          onStateChange={handleFormStatus}
        />
      ) : (
        <>
          <Row gap="three" pt="two">
            <PlaceIcon
              category={place.category}
              icon={place.icon}
              color={place.color}
              size={64}
            />
            <Stack gap="half" flex>
              <Row gap="one">
                <ThemedText style={styles.identityName} numberOfLines={2}>
                  {place.name}
                </ThemedText>
                {place.isFavorite ? <Icon name="star" size={16} color={theme.accent} /> : null}
              </Row>
              <ThemedText type="small" themeColor="textSecondary">
                {strings.place.categories[place.category]}
              </ThemedText>
            </Stack>
          </Row>

          <Card style={styles.facts}>
            <NavRow
              label={strings.place.defaultRadius}
              value={formatDistance(place.defaultRadiusM, unit)}
            />
            <NavRow
              label={strings.place.location}
              value={formatCoordinates(place.latitude, place.longitude)}
              last
            />
          </Card>

          {tripsCard}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  savedBanner: {
    paddingVertical: Spacing.three,
  },
  identityName: {
    flexShrink: 1,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
  },
  facts: {
    paddingVertical: Spacing.two,
  },
  tripsCard: {
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  tripsHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  tripsTitle: {
    fontSize: 16,
    fontWeight: '700',
  },

  footerAction: {
    flex: 1,
  },
});
