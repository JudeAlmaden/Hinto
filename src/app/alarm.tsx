import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { BackHandler, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { AppButton, Card } from '@/components/ui/controls';
import { Stack as VStack } from '@/components/ui/layout';
import { HoldButton } from '@/components/ui/hold-button';
import { Mascot } from '@/components/ui/mascot';
import { formatCopy, strings } from '@/constants/strings';
import { MaxContentWidth, Radii, Spacing } from '@/constants/theme';
import { getDatabase } from '@/db/client';
import {
  getActiveAlarm,
  snoozeAlarm,
  subscribeToAlarm,
  deliverAlarm,
  wakeNow,
} from '@/modules/alarm/delivery';
import type { ActiveAlarm } from '@/modules/alarm';
import { TERMINAL_STATUSES, type Journey, type JourneyAlert } from '@/modules/journeys';
import {
  clearJourneyAlertSnooze,
  getActiveJourney,
  getJourney,
  getLatestJourneyAlert,
  snoozeJourneyAlert,
} from '@/modules/journeys/repository';
import { endJourneySession } from '@/modules/location/session';
import { DEFAULT_SETTINGS, type AppSettings } from '@/modules/settings/schema';
import { getSettings } from '@/modules/settings/repository';
import { formatClock, formatDistance } from '@/utils/format';
import { openJourneyResult } from '@/utils/navigation';

export default function AlarmScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ journeyId?: string }>();
  const journeyId = typeof params.journeyId === 'string' ? params.journeyId : '';

  const [journey, setJourney] = useState<Journey | null>(null);
  const [alert, setAlert] = useState<JourneyAlert | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [activeAlarm, setActiveAlarm] = useState<ActiveAlarm | null>(getActiveAlarm());
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

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
      customSoundUri: settings.custom_alarm_uri,
      snoozeMinutes: settings.snooze_minutes,
      vibration: settings.vibration_enabled,
      vibrationRepeat: settings.vibration_repeat,
      repeatUntilDismissed: settings.repeat_until_dismissed,
      stageIndex: alert.stageIndex,
      estimateOnly: false,
    });
  }, [journey, alert, settings]);

  // While this process holds a live alarm, it is the truth: after a snooze
  // expires the alarm is ringing again even though the saved alert still carries
  // the old snooze deadline. The row only decides when there is no live alarm
  // (cold start in the middle of a snooze).
  const snoozedUntil = activeAlarm
    ? activeAlarm.snoozedUntil
    : (alert?.snoozedUntil ?? null);
  const snoozed = snoozedUntil !== null && snoozedUntil > now;

  // The alarm cannot be left with the system back gesture: it keeps ringing and
  // the only ways out are "I'm awake" or a deliberate snooze.
  useEffect(() => {
    if (snoozed) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [snoozed]);

  const goHome = () => {
    if (router.canDismiss()) router.dismissAll();
    else router.replace('/');
  };

  // A ref guards the tap itself: `busy` only updates on the next render, which
  // is too late for two presses in the same frame.
  const acting = useRef(false);

  const run = async (action: () => Promise<void>) => {
    if (acting.current) return;
    acting.current = true;
    setBusy(true);
    try {
      await action();
    } finally {
      acting.current = false;
      setBusy(false);
    }
  };

  const finish = () => {
    if (!journey) return;
    void run(async () => {
      await endJourneySession(journey.id, 'completed');
      openJourneyResult(router, journey.id);
    });
  };

  const doSnooze = () => {
    if (!journey || !alert) return;
    void run(async () => {
      // Cold start mid-alert: the screen owns presentation until the user acts.
      if (!getActiveAlarm()) {
        await deliverAlarm({
          journeyId: journey.id,
          alertId: alert.id,
          destinationName: journey.destinationName,
          distanceM: alert.triggerDistanceM,
          sound: settings.alarm_sound_id,
          customSoundUri: settings.custom_alarm_uri,
          snoozeMinutes: settings.snooze_minutes,
          vibration: settings.vibration_enabled,
          vibrationRepeat: settings.vibration_repeat,
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
    });
  };

  const doWakeNow = () => {
    void run(async () => {
      if (alert) {
        const db = await getDatabase();
        await clearJourneyAlertSnooze(db, alert.id);
        setAlert({ ...alert, snoozedUntil: null });
      }
      await wakeNow();
    });
  };

  // A notification for a journey that already ended (or one left under the
  // stack) must not show live alarm controls: ending it again would rewrite the
  // saved record.
  const ended = journey !== null && TERMINAL_STATUSES.includes(journey.status);

  const distance = alert ? formatDistance(alert.triggerDistanceM, settings.distance_unit) : '';

  return (
    <ThemedView style={styles.root}>
      <Stack.Screen options={{ gestureEnabled: false, headerShown: false }} />
      <SafeAreaView style={styles.safe}>
        {!journey || ended ? (
          <VStack center flex gap="three">
            <ThemedText style={styles.headline}>{strings.alarm.headline}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {strings.alarm.noJourney}
            </ThemedText>
            <AppButton label={strings.alarm.goHome} variant="secondary" onPress={goHome} />
          </VStack>
        ) : snoozed ? (
          <VStack center flex gap="three">
            <ThemedText style={styles.eyebrow}>{strings.alarm.headline}</ThemedText>
            <ThemedText style={styles.destination}>{journey.destinationName}</ThemedText>
            <Card style={styles.snoozeCard}>
              <ThemedText style={styles.body}>
                {formatCopy(strings.alarm.snoozedUntil, {
                  time: formatClock(snoozedUntil ?? now),
                })}
              </ThemedText>
            </Card>
            <AppButton
              label={strings.alarm.wakeNow}
              disabled={busy}
              onPress={() => void doWakeNow()}
            />
            <AppButton
              label={strings.alarm.imAwake}
              variant="secondary"
              disabled={busy}
              onPress={() => void finish()}
            />
            <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
              {strings.alarm.limitation}
            </ThemedText>
          </VStack>
        ) : (
          <VStack center flex gap="three">
            <Mascot pose="alert" height={104} />
            <ThemedText style={styles.eyebrow}>{strings.alarm.headline.toUpperCase()}</ThemedText>
            <ThemedText style={styles.destination}>{journey.destinationName}</ThemedText>
            <ThemedText style={styles.distance}>
              {formatCopy(strings.alarm.away, { distance })}
            </ThemedText>

            <View style={styles.progressTrack}>
              <View style={styles.progressFill} />
            </View>

            <VStack gap="two" style={styles.actions}>
              {settings.require_hold_to_dismiss ? (
                <HoldButton
                  label={strings.alarm.imAwake}
                  disabled={busy}
                  onConfirm={() => void finish()}
                />
              ) : (
                <AppButton
                  label={strings.alarm.imAwake}
                  disabled={busy}
                  onPress={() => void finish()}
                />
              )}
              <AppButton
                label={formatCopy(strings.alarm.snooze, { minutes: settings.snooze_minutes })}
                variant="secondary"
                disabled={busy}
                onPress={() => void doSnooze()}
              />
            </VStack>
            <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
              {strings.alarm.limitation}
            </ThemedText>
          </VStack>
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
