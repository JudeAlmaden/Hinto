import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/controls';
import { Screen } from '@/components/ui/screen';
import { strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { useSettings } from '@/hooks/use-settings';
import { ALARM_SOUNDS, type AlarmSoundId } from '@/modules/alarm';
import { configureAlarmAudio, startAlarmLoop, stopAlarmLoop } from '@/modules/alarm/player';

const PREVIEW_MS = 4000;

export default function AlarmSoundScreen() {
  const { settings, update } = useSettings();
  const [playing, setPlaying] = useState<AlarmSoundId | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void configureAlarmAudio();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      stopAlarmLoop();
    };
  }, []);

  const preview = (sound: AlarmSoundId) => {
    if (timer.current) clearTimeout(timer.current);
    stopAlarmLoop();
    startAlarmLoop(sound, false);
    setPlaying(sound);
    timer.current = setTimeout(() => {
      stopAlarmLoop();
      setPlaying(null);
    }, PREVIEW_MS);
  };

  return (
    <Screen title={strings.sound.title} back>
      <View>
        {ALARM_SOUNDS.map((sound) => (
          <Pressable
            key={sound}
            onPress={() => {
              void update({ alarm_sound_id: sound });
              preview(sound);
            }}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
            <View style={styles.text}>
              <ThemedText style={styles.name}>{strings.sound[sound]}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {playing === sound ? strings.alarmTest.playing : strings.sound.preview}
              </ThemedText>
            </View>
            <ThemedText style={styles.check}>
              {settings.alarm_sound_id === sound ? '✓' : ''}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <Card style={styles.note}>
        <ThemedText type="small" themeColor="textSecondary">
          {strings.sound.note}
        </ThemedText>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.three,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.3)',
    gap: Spacing.two,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  check: {
    fontSize: 18,
    color: '#208AEF',
    width: 22,
    textAlign: 'center',
  },
  note: {
    paddingVertical: Spacing.three,
  },
});
