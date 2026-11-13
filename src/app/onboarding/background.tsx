import { useRouter } from 'expo-router';

import { PermissionStep } from '@/components/permission-step';
import { strings } from '@/constants/strings';

export default function BackgroundOnboardingScreen() {
  const router = useRouter();

  return (
    <PermissionStep
      permission="backgroundLocation"
      step={4}
      title={strings.onboarding.backgroundTitle}
      body={strings.onboarding.backgroundBody}
      note={strings.onboarding.backgroundNote}
      deniedTitle={strings.onboarding.backgroundDeniedTitle}
      deniedBody={strings.onboarding.backgroundDeniedBody}
      onContinue={() => router.push('/onboarding/notifications')}
    />
  );
}
