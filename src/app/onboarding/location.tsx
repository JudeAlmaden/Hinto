import { useRouter } from 'expo-router';

import { PermissionStep } from '@/components/permission-step';
import { strings } from '@/constants/strings';

export default function LocationOnboardingScreen() {
  const router = useRouter();

  return (
    <PermissionStep
      permission="foregroundLocation"
      step={3}
      title={strings.onboarding.locationTitle}
      body={strings.onboarding.locationBody}
      note={strings.onboarding.locationNote}
      deniedTitle={strings.onboarding.locationDeniedTitle}
      deniedBody={strings.onboarding.locationDeniedBody}
      onContinue={() => router.push('/onboarding/background')}
    />
  );
}
