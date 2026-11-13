import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { OnboardingShell } from '@/components/onboarding-shell';
import { strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';

const STEPS = [
  strings.onboarding.howStep1,
  strings.onboarding.howStep2,
  strings.onboarding.howStep3,
];

export default function HowItWorksScreen() {
  const router = useRouter();

  return (
    <OnboardingShell
      step={2}
      title={strings.onboarding.howTitle}
      body={strings.onboarding.howOffline}
      primaryLabel={strings.onboarding.continue}
      onPrimary={() => router.push('/onboarding/location')}
      skipTo="/onboarding/ready">
      <View style={styles.steps}>
        {STEPS.map((step, index) => (
          <View key={step} style={styles.step}>
            <View style={styles.badge}>
              <ThemedText type="smallBold">{index + 1}</ThemedText>
            </View>
            <ThemedText type="small" style={styles.stepLabel}>
              {step}
            </ThemedText>
          </View>
        ))}
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  steps: {
    alignSelf: 'stretch',
    gap: Spacing.three,
  },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#208AEF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepLabel: {
    flex: 1,
  },
});
