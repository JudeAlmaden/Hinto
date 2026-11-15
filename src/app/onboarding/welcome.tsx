import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { OnboardingShell } from '@/components/onboarding-shell';
import { Mascot } from '@/components/ui/mascot';
import { strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <OnboardingShell
      step={1}
      back={false}
      skipTo="/onboarding/ready"
      title={strings.onboarding.welcomeTitle}
      body={strings.onboarding.welcomeBody}
      primaryLabel={strings.onboarding.getStarted}
      onPrimary={() => router.push('/onboarding/how-it-works')}
      secondaryLabel={strings.onboarding.howItWorks}
      onSecondary={() => router.push('/onboarding/how-it-works')}>
      <Mascot pose="friendly" height={176} />
      <ThemedText type="small" themeColor="textSecondary" style={styles.tagline}>
        {strings.tagline}
      </ThemedText>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  tagline: {
    marginTop: Spacing.two,
  },
});
