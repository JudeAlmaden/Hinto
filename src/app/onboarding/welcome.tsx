import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { OnboardingShell } from '@/components/onboarding-shell';
import { strings } from '@/constants/strings';
import { Radii, Spacing } from '@/constants/theme';

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
      <View style={styles.mark}>
        <ThemedText style={styles.markGlyph}>◎</ThemedText>
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {strings.tagline}
      </ThemedText>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  mark: {
    width: 96,
    height: 96,
    borderRadius: Radii.pill,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.two,
  },
  markGlyph: {
    fontSize: 44,
    color: '#FFFFFF',
  },
});
