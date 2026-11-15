import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { ThemedText } from '@/components/themed-text';
import { AppButton, Card, NavRow } from '@/components/ui/controls';
import { Screen } from '@/components/ui/screen';
import { strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { useSettings } from '@/hooks/use-settings';
import { configureAlarmAudio, startAlarmLoop, stopAlarmLoop } from '@/modules/alarm/player';

const TEST_MS = 6000;

export default function AlarmTestScreen() {
  const router = useRouter();
  const { settings } = useSettings();
  const [playing, setPlaying] = useState(false);
  const [vibrated, setVibrated] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void configureAlarmAudio();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      stopAlarmLoop();
    };
  }, []);

  const stop = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    stopAlarmLoop();
    setPlaying(false);
  };

  const play = async () => {
    await configureAlarmAudio();
    startAlarmLoop(settings.alarm_sound_id, false, settings.custom_alarm_uri);
    setPlaying(true);

    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setVibrated(true);
    } catch {
      setVibrated(false);
    }

    timer.current = setTimeout(stop, TEST_MS);
  };

  return (
    <Screen title={strings.alarmTest.title} back>
      <Card style={styles.card}>
        <ThemedText type="small" themeColor="textSecondary">
          {strings.alarmTest.body}
        </ThemedText>
        <AppButton
          label={playing ? strings.alarmTest.stop : strings.alarmTest.play}
          variant={playing ? 'secondary' : 'primary'}
          onPress={() => (playing ? stop() : void play())}
        />
      </Card>

      <View>
        <NavRow label={strings.alarmTest.volume} last={false} />
        <NavRow
          label={strings.alarmTest.vibration}
          value={vibrated ? strings.alarmTest.vibrationFired : undefined}
          last
        />
        <NavRow
          label={strings.settings.alarmSound}
          value={settings.alarm_sound_id}
          onPress={() => router.push('/settings/sound')}
          last
        />
      </View>

      <ThemedText type="small" themeColor="textSecondary">
        {strings.alarmTest.limitation}
      </ThemedText>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
});
