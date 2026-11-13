import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton, Card, NavRow, ToggleRow } from '@/components/ui/controls';
import { ReadinessChecklist, type ChecklistItem } from '@/components/ui/checklist';
import { RadiusPicker } from '@/components/ui/radius-picker';
import { Screen } from '@/components/ui/screen';
import { formatCopy, strings } from '@/constants/strings';
import { DEFAULT_RADIUS_M, isRadiusValid } from '@/constants/alarms';
import { Spacing } from '@/constants/theme';
import { getDatabase } from '@/db/client';
import { useSettings } from '@/hooks/use-settings';
import type { Destination } from '@/modules/places';
import { replaceAlertRules } from '@/modules/journeys/repository';
import {
  cancelPreparedJourney,
  JourneyStartBlockedError,
  prepareJourneySession,
  startJourneySession,
} from '@/modules/location/session';
import type { ReadinessIssue } from '@/modules/permissions';
import { formatCoordinates, formatRadius } from '@/utils/format';
import { suggestedEarlierRadius } from '@/utils/radius';

export default function JourneySetupScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    name?: string;
    latitude?: string;
    longitude?: string;
    radius?: string;
    placeId?: string;
  }>();
  const { settings } = useSettings();

  const destination: Destination = {
    name: params.name ?? '',
    latitude: Number(params.latitude ?? 0),
    longitude: Number(params.longitude ?? 0),
    placeId: params.placeId || null,
  };

  const requestedRadius = Number(params.radius);
  const [radius, setRadius] = useState(
    isRadiusValid(requestedRadius) ? requestedRadius : DEFAULT_RADIUS_M,
  );
  const [earlier, setEarlier] = useState(false);
  const [journeyId, setJourneyId] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [blocked, setBlocked] = useState<ReadinessIssue[]>([]);
  const [error, setError] = useState<string | null>(null);

  const journeyIdRef = useRef<string | null>(null);
  const startedRef = useRef(false);
  const destinationRef = useRef(destination);

  useEffect(() => {
    let cancelled = false;

    prepareJourneySession(destinationRef.current, radius, earlier ? suggestedEarlierRadius(radius) : null)
      .then((journey) => {
        if (cancelled) {
          void cancelPreparedJourney(journey.id);
          return;
        }
        journeyIdRef.current = journey.id;
        setJourneyId(journey.id);
      })
      .catch((reason: unknown) => {
        setError(reason instanceof Error ? reason.message : strings.common.errorBody);
      });

    return () => {
      cancelled = true;
      const id = journeyIdRef.current;
      if (id && !startedRef.current) void cancelPreparedJourney(id);
    };
    // The prepared row is created once; radius changes are applied below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!journeyId) return;
    const primary = radius;
    const rules = earlier
      ? [
          { radiusM: suggestedEarlierRadius(primary), stageIndex: 0 },
          { radiusM: primary, stageIndex: 1 },
        ]
      : [{ radiusM: primary, stageIndex: 0 }];

    void getDatabase()
      .then((db) => replaceAlertRules(db, journeyId, rules))
      .catch(() => undefined);
  }, [journeyId, radius, earlier]);

  const start = async () => {
    const id = journeyIdRef.current;
    if (!id) return;

    setStarting(true);
    setError(null);
    try {
      await startJourneySession(id);
      startedRef.current = true;
      router.replace({ pathname: '/journey/[id]', params: { id } });
    } catch (reason) {
      if (reason instanceof JourneyStartBlockedError) {
        setBlocked(reason.issues);
      } else {
        setError(reason instanceof Error ? reason.message : strings.common.errorBody);
      }
    } finally {
      setStarting(false);
    }
  };

  const checklist: ChecklistItem[] = blocked.map((issue) => ({
    key: issue.key,
    label: issue.message,
    state: 'blocking',
    onPress: () => router.push('/settings/permissions'),
  }));

  return (
    <Screen
      title={strings.journeySetup.title}
      back
      footer={
        <>
          {blocked.length > 0 ? <ReadinessChecklist items={checklist} /> : null}
          <AppButton
            label={blocked.length > 0 ? strings.journeySetup.enableBackground : strings.journeySetup.start}
            onPress={() => void start()}
            disabled={journeyId === null || starting}
            loading={starting}
          />
        </>
      }>
      <Card style={styles.summary}>
        <ThemedText style={styles.destination} numberOfLines={2}>
          {destination.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {formatCoordinates(destination.latitude, destination.longitude)}
        </ThemedText>
      </Card>

      <View style={styles.group}>
        <ThemedText type="small" themeColor="textSecondary">
          {strings.journeySetup.alertDistance}
        </ThemedText>
        <RadiusPicker value={radius} onChange={setRadius} unit={settings.distance_unit} />
        <ThemedText type="small" themeColor="textSecondary">
          {formatCopy(strings.journeySetup.summary, {
            distance: formatRadius(radius, settings.distance_unit),
          })}
        </ThemedText>
        {radius <= 500 ? (
          <ThemedText type="small" style={styles.warning}>
            {strings.journeySetup.accuracyWarning}
          </ThemedText>
        ) : null}
      </View>

      <ToggleRow
        label={strings.journeySetup.earlierWarning}
        description={formatCopy(strings.journeySetup.earlierAt, {
          distance: formatRadius(suggestedEarlierRadius(radius), settings.distance_unit),
        })}
        value={earlier}
        onValueChange={setEarlier}
      />

      <NavRow
        label={strings.settings.alarmSound}
        value={settings.alarm_sound_id}
        onPress={() => router.push('/settings/sound')}
      />

      {error ? (
        <ThemedText type="small" style={styles.error}>
          {error}
        </ThemedText>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    paddingVertical: Spacing.three,
    gap: Spacing.one,
  },
  destination: {
    fontSize: 20,
    fontWeight: '700',
  },
  group: {
    gap: Spacing.two,
  },
  warning: {
    color: '#F5A623',
  },
  error: {
    color: '#E5484D',
  },
});
