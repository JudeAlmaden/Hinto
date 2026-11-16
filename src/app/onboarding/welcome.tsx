import { useRouter } from 'expo-router';

import { OnboardingShell } from '@/components/onboarding-shell';
import { Mascot } from '@/components/ui/mascot';
import { strings } from '@/constants/strings';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <OnboardingShell
      step={1}
      back={false}
      skipTo="/onboarding/ready"
      hero={<Mascot pose="friendly" height={160} />}
      tagline={strings.tagline}
      title={strings.onboarding.welcomeTitle}
      body={strings.onboarding.welcomeBody}
      primaryLabel={strings.onboarding.getStarted}
      onPrimary={() => router.push('/onboarding/how-it-works')}
      secondaryLabel={strings.onboarding.howItWorks}
      onSecondary={() => router.push('/onboarding/how-it-works')}
    />
  );
}
