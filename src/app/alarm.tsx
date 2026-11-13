import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton, Card } from '@/components/ui/controls';
import { confirmAction } from '@/components/ui/confirm';
import { HoldButton } from '@/components/ui/hold-button';
import { formatCopy, strings } from '@/constants/strings';
import { MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { getDatabase } from '@/db/client';
import {
  dismissAlarmPresentation,
  getActiveAlarm,
  snoozeAlarm,
  subscribeToAlarm,
  deliverAlarm,
  wakeNow,
} from '@/modules/alarm/delivery';
import type { ActiveAlarm } from '@/modules/alarm';
import type { Journey, JourneyAlert } from '@/modules/journeys';
import {
  clearJourneyAlertSnooze,
  dismissJourneyAlert,
  getActiveJourney,
  getJourney,
  getLatestJourneyAlert,
  snoozeJourneyAlert,
} from '@/modules/journeys/repository';
import { endJourneySession } from '@/modules/location/session';
import { DEFAULT_SETTINGS, type AppSettings } from '@/modules/settings/schema';
import { getSettings } from '@/modules/settings/repository';
import { formatClock, formatDistance } from '@/utils/format';

export default function AlarmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ journeyId?: string }>();
  const journeyId = typeof params.journeyId === 'string' ? params.journeyId : '';

  const [journey, setJourney] = useState<Journey | null>(null);
  const [alert, setAlert] = useState<JourneyAlert | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarm | null>(getActiveAlarm());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => subscribeToAlarm(setActiveAlarm), []);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const db = await getDatabase();
      const loaded = journeyId ? await getJourney(db, journeyId) : await getActiveJourney(db);
      if (cancelled || !loaded) return;

      const [latest, config] = await Promise.all([
        getLatestJourneyAlert(db, loaded.id),
        getSettings(db),
      ]);
      if (cancelled) return;

      setJourney(loaded);
      setAlert(latest);
      setSettings(config);
    })().catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [journeyId]);

  /**
   * Cold start or notification tap: the OS notification has already rung, and
   * this screen takes over the loop (D1). A snoozed alert stays quiet.
   */
  useEffect(() => {
    if (!journey || !alert || getActiveAlarm()) return;
    if (journey.status !== 'triggered') return;
    if (alert.dismissedAt !== null) return;
    if (alert.snoozedUntil !== null && alert.snoozedUntil > Date.now()) return;

    void deliverAlarm({
      journeyId: journey.id,
      alertId: alert.id,
      destinationName: journey.destinationName,
      distanceM: alert.triggerDistanceM,
      sound: settings.alarm_sound_id,
      snoozeMinutes: settings.snooze_minutes,
      vibration: settings.vibration_enabled,
      repeatUntilDismissed: settings.repeat_until_dismissed,
      stageIndex: alert.stageIndex,
      estimateOnly: false,
    });
  }, [journey, alert, settings]);

  const snoozedUntil = activeAlarm?.snoozedUntil ?? alert?.snoozedUntil ?? null;
  const snoozed = snoozedUntil !== null && snoozedUntil > now;

  const finish = async () => {
    if (!journey) return;
    await endJourneySession(journey.id, 'completed');
    router.replace({ pathname: '/history/[id]', params: { id: journey.id } });
  };

  const doSnooze = async () => {
    if (!journey || !alert) return;
    if (!getActiveAlarm()) {
      await deliverAlarm({
        journeyId: journey.id,
        alertId: alert.id,
        destinationName: journey.destinationName,
        distanceM: alert.triggerDistanceM,
        sound: settings.alarm_sound_id,
        snoozeMinutes: settings.snooze_minutes,
        vibration: settings.vibration_enabled,
        repeatUntilDismissed: settings.repeat_until_dismissed,
        stageIndex: alert.stageIndex,
        estimateOnly: false,
      });
    }

    const db = await getDatabase();
    const until = Date.now() + settings.snooze_minutes * 60_000;
    await snoozeJourneyAlert(db, alert.id, until);
    setAlert({ ...alert, snoozedUntil: until });
    await snoozeAlarm(settings.snooze_minutes);
  };

  const doWakeNow = async () => {
    if (alert) {
      const db = await getDatabase();
      await clearJourneyAlertSnooze(db, alert.id);
      setAlert({ ...alert, snoozedUntil: null });
    }
    await wakeNow();
  };

  const doDismiss = () => {
    confirmAction({
      title: strings.alarm.dismissTitle,
      body: strings.alarm.dismissBody,
      confirmLabel: strings.alarm.dismiss,
      onConfirm: () => {
        void (async () => {
          if (alert) {
            const db = await getDatabase();
            await dismissJourneyAlert(db, alert.id);
          }
          await dismissAlarmPresentation();
          if (journey) router.replace({ pathname: '/journey/[id]', params: { id: journey.id } });
          else router.replace('/');
        })();
      },
    });
  };

  const distance = alert ? formatDistance(alert.triggerDistanceM, settings.distance_unit) : '';

  return (
    <ThemedView style={styles.root}>
      <Stack.Screen options={{ gestureEnabled: false, headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        {!journey ? (
          <View style={styles.center}>
            <ThemedText style={styles.headline}>{strings.alarm.headline}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {strings.alarm.noJourney}
            </ThemedText>
            <AppButton
              label={strings.alarm.goHome}
              variant="secondary"
              onPress={() => router.replace('/')}
            />
          </View>
        ) : snoozed ? (
          <View style={styles.center}>
            <ThemedText style={styles.eyebrow}>{strings.alarm.headline}</ThemedText>
            <ThemedText style={styles.destination}>{journey.destinationName}</ThemedText>
            <Card style={styles.snoozeCard}>
              <ThemedText style={styles.body}>
                {formatCopy(strings.alarm.snoozedUntil, {
                  time: formatClock(snoozedUntil ?? now),
                })}
              </ThemedText>
            </Card>
            <AppButton label={strings.alarm.wakeNow} onPress={() => void doWakeNow()} />
            <AppButton
              label={strings.alarm.imAwake}
              variant="secondary"
              onPress={() => void finish()}
            />
            <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
              {strings.alarm.limitation}
            </ThemedText>
          </View>
        ) : (
          <View style={styles.center}>
            <ThemedText style={styles.eyebrow}>⏰ {strings.alarm.headline.toUpperCase()}</ThemedText>
            <ThemedText style={styles.destination}>{journey.destinationName}</ThemedText>
            <ThemedText style={styles.distance}>
              {formatCopy(strings.alarm.away, { distance })}
            </ThemedText>

            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>

            <View style={styles.actions}>
              {settings.require_hold_to_dismiss ? (
                <HoldButton label={strings.alarm.imAwake} onConfirm={() => void finish()} />
              ) : (
                <AppButton label={strings.alarm.imAwake} onPress={() => void finish()} />
              )}
              <AppButton
                label={formatCopy(strings.alarm.snooze, { minutes: settings.snooze_minutes })}
                variant="secondary"
                onPress={() => void doSnooze()}
              />
              <AppButton label={strings.alarm.dismiss} variant="ghost" onPress={doDismiss} />
            </View>

            <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
              {strings.alarm.limitation}
            </ThemedText>
          </View>
        )}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  safe: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    maxWidth: MaxContentWidth,
    alignSelf: 'center',
    width: '100%',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.three,
  },
  eyebrow: {
    fontSize: 14,
    letterSpacing: 1.5,
    fontWeight: '700',
    color: '#F5A623',
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
  },
  destination: {
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
  },
  distance: {
    fontSize: 20,
    color: '#9AA0A6',
  },
  progressTrack: {
    alignSelf: 'stretch',
    height: 10,
    borderRadius: Radii.pill,
    backgroundColor: 'rgba(245,166,35,0.25)',
    overflow: 'hidden',
  },
  progressFill: {
    width: '70%',
    height: '100%',
    backgroundColor: '#F5A623',
  },
  actions: {
    alignSelf: 'stretch',
    gap: Spacing.two,
  },
  snoozeCard: {
    alignSelf: 'stretch',
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
  body: {
    fontSize: 18,
    fontWeight: '600',
  },
  note: {
    textAlign: 'center',
    paddingTop: Spacing.two,
  },
});
