import { useRouter } from 'expo-router';

import { PermissionStep } from '@/components/permission-step';
import { strings } from '@/constants/strings';

export default function NotificationsOnboardingScreen() {
  const router = useRouter();

  return (
    <PermissionStep
      permission="notifications"
      step={5}
      title={strings.onboarding.notificationsTitle}
      body={strings.onboarding.notificationsBody}
      note={strings.onboarding.notificationsNote}
      deniedTitle={strings.onboarding.notificationsDeniedTitle}
      deniedBody={strings.onboarding.notificationsDeniedBody}
      onContinue={() => router.push('/onboarding/battery')}
    />
  );
}
