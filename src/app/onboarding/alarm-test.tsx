import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import { OnboardingShell } from '@/components/onboarding-shell';
import { AppButton } from '@/components/ui/controls';
import { strings } from '@/constants/strings';
import { useSettings } from '@/hooks/use-settings';
import { configureAlarmAudio, startAlarmLoop, stopAlarmLoop } from '@/modules/alarm/player';

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
    };
  }, []);

  const toggle = () => {
    if (playing) {
      if (timer.current) clearTimeout(timer.current);
      stopAlarmLoop();
      setPlaying(false);
      return;
    }

    startAlarmLoop(settings.alarm_sound_id, false, settings.custom_alarm_uri);
    setPlaying(true);
    timer.current = setTimeout(() => {
      stopAlarmLoop();
      setPlaying(false);
    }, 6000);
  };

  return (
    <OnboardingShell
      step={7}
      title={strings.onboarding.alarmTitle}
      body={strings.onboarding.alarmBody}
      note={strings.alarmTest.limitation}
      primaryLabel={strings.onboarding.continue}
      onPrimary={() => router.push('/onboarding/ready')}
      skipTo="/onboarding/ready">
      <AppButton
        label={playing ? strings.alarmTest.stop : strings.alarmTest.play}
        onPress={toggle}
      />
    </OnboardingShell>
  );
}
