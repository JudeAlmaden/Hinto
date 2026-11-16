import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding-shell';
import { AppButton } from '@/components/ui/controls';
import { Mascot } from '@/components/ui/mascot';
import { strings } from '@/constants/strings';
import { useSettings } from '@/hooks/use-settings';
import { configureAlarmAudio, startAlarmLoop, stopAlarmLoop } from '@/modules/alarm/player';
import { startAlarmVibration, stopAlarmVibration } from '@/modules/alarm/vibration';

export default function AlarmTestOnboardingScreen() {
  const router = useRouter();
  const { settings } = useSettings();
  const [playing, setPlaying] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    void configureAlarmAudio();
    return () => {
      if (timer.current) clearTimeout(timer.current);
      stopAlarmLoop();
      stopAlarmVibration();
    };
  }, []);

  const toggle = () => {
    if (playing) {
      if (timer.current) clearTimeout(timer.current);
      stopAlarmLoop();
      stopAlarmVibration();
      setPlaying(false);
      return;
    }

    startAlarmLoop(settings.alarm_sound_id, false, settings.custom_alarm_uri);
    if (settings.vibration_enabled) startAlarmVibration(settings.vibration_repeat);
    setPlaying(true);
    timer.current = setTimeout(() => {
      stopAlarmLoop();
      stopAlarmVibration();
      setPlaying(false);
    }, 6000);
  };

  return (
    <OnboardingShell
      step={7}
      hero={<Mascot pose="alert" height={130} />}
      title={strings.onboarding.alarmTitle}
      body={strings.onboarding.alarmBody}
      note={strings.alarmTest.limitation}
      primaryLabel={strings.onboarding.continue}
      onPrimary={() => router.push('/onboarding/ready')}
      skipTo="/onboarding/ready">
      <View style={styles.buttonWrapper}>
        <AppButton
          label={playing ? strings.alarmTest.stop : strings.alarmTest.play}
          variant={playing ? 'danger' : 'secondary'}
          onPress={toggle}
        />
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  buttonWrapper: {
    width: '100%',
  },
});
