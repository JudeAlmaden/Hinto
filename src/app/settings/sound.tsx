import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Icon } from '@/components/ui/icon';
import { AppButton, Card, SectionLabel } from '@/components/ui/controls';
import { Screen } from '@/components/ui/screen';
import { strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { useSettings } from '@/hooks/use-settings';
import { useTheme } from '@/hooks/use-theme';
import { ALARM_SOUNDS, type AlarmSoundId } from '@/modules/alarm';
import {
  customSoundFileName,
  deleteCustomAlarmSound,
  pickCustomAlarmSound,
} from '@/modules/alarm/custom-sound';
import { configureAlarmAudio, startAlarmLoop, stopAlarmLoop } from '@/modules/alarm/player';

const PREVIEW_MS = 4000;

export default function AlarmSoundScreen() {
  const theme = useTheme();
  const { settings, update } = useSettings();
  const [playing, setPlaying] = useState<AlarmSoundId | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const customUri = settings.custom_alarm_uri;

  useEffect(() => {
    void configureAlarmAudio();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      stopAlarmLoop();
    };
  }, []);

  const play = (sound: AlarmSoundId, uri: string | null = customUri) => {
    if (timer.current) clearTimeout(timer.current);
    stopAlarmLoop();
    startAlarmLoop(sound, false, uri);
    setPlaying(sound);
    timer.current = setTimeout(() => {
      stopAlarmLoop();
      setPlaying(null);
    }, PREVIEW_MS);
  };

  const choose = async () => {
    setError(null);
    setBusy(true);
    try {
      const uri = await pickCustomAlarmSound();
      if (!uri) return;

      const previous = customUri;
      await update({ custom_alarm_uri: uri, alarm_sound_id: 'custom' });
      if (previous) deleteCustomAlarmSound(previous);
      play('custom', uri);
    } catch {
      setError(strings.sound.customFailed);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (timer.current) clearTimeout(timer.current);
    stopAlarmLoop();
    setPlaying(null);
    deleteCustomAlarmSound(customUri);
    await update({
      custom_alarm_uri: null,
      alarm_sound_id: settings.alarm_sound_id === 'custom' ? 'classic' : settings.alarm_sound_id,
    });
  };

  const customName = customSoundFileName(customUri);

  return (
    <Screen title={strings.sound.title} back>
      <View>
        {ALARM_SOUNDS.map((sound) => (
          <Pressable
            key={sound}
            onPress={() => {
              void update({ alarm_sound_id: sound });
              play(sound);
            }}
            style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
            <View style={styles.text}>
              <ThemedText style={styles.name}>{strings.sound[sound]}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {playing === sound ? strings.alarmTest.playing : strings.sound.preview}
              </ThemedText>
            </View>
            <ThemedText style={[styles.check, { color: theme.accent }]}>
              {settings.alarm_sound_id === sound ? (
                <Icon name="checkmark" size={18} themeColor="accent" />
              ) : null}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <SectionLabel>{strings.sound.custom}</SectionLabel>

      {customUri ? (
        <Pressable
          onPress={() => {
            void update({ alarm_sound_id: 'custom' });
            play('custom');
          }}
          style={({ pressed }) => [styles.row, pressed && { opacity: 0.6 }]}>
          <View style={styles.text}>
            <ThemedText style={styles.name} numberOfLines={1}>
              {customName ?? strings.sound.custom}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {playing === 'custom' ? strings.alarmTest.playing : strings.sound.preview}
            </ThemedText>
          </View>
          <ThemedText style={[styles.check, { color: theme.accent }]}>
            {settings.alarm_sound_id === 'custom' ? (
              <Icon name="checkmark" size={18} themeColor="accent" />
            ) : null}
          </ThemedText>
        </Pressable>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          {strings.sound.customEmpty}
        </ThemedText>
      )}

      <AppButton
        label={customUri ? strings.sound.replace : strings.sound.choose}
        variant="secondary"
        onPress={() => void choose()}
        loading={busy}
      />

      {customUri ? (
        <AppButton
          label={strings.sound.remove}
          variant="ghost"
          onPress={() => void remove()}
        />
      ) : null}

      {error ? (
        <ThemedText type="small" style={{ color: theme.danger }}>
          {error}
        </ThemedText>
      ) : null}

      <Card style={styles.note}>
        <ThemedText type="small" themeColor="textSecondary">
          {strings.sound.note}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {strings.sound.customNote}
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
    width: 22,
    textAlign: 'center',
  },
  note: {
    paddingVertical: Spacing.three,
    gap: Spacing.one,
  },
});
