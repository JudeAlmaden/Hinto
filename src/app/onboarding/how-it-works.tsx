import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { OnboardingShell } from '@/components/onboarding-shell';
import { Card } from '@/components/ui/controls';
import { Row, Stack } from '@/components/ui/layout';
import { Mascot } from '@/components/ui/mascot';
import { strings } from '@/constants/strings';
import { Radii, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const STEPS = [
  strings.onboarding.howStep1,
  strings.onboarding.howStep2,
  strings.onboarding.howStep3,
];

export default function HowItWorksScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <OnboardingShell
      step={2}
      hero={<Mascot pose="navigator" height={130} />}
      title={strings.onboarding.howTitle}
      body={strings.onboarding.howOffline}
      primaryLabel={strings.onboarding.continue}
      onPrimary={() => router.push('/onboarding/location')}
      skipTo="/onboarding/ready">
      <Stack gap="two" style={styles.steps}>
        {STEPS.map((step, index) => (
          <Card key={step} style={styles.stepCard}>
            <Row gap="three" align="center">
              <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                <ThemedText style={[styles.badgeText, { color: theme.accentText }]}>
                  {index + 1}
                </ThemedText>
              </View>
              <ThemedText type="small" style={styles.stepLabel}>
                {step}
              </ThemedText>
            </Row>
          </Card>
        ))}
      </Stack>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  steps: {
    width: '100%',
  },
  stepCard: {
    width: '100%',
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
  },
  badge: {
    width: 26,
    height: 26,
    borderRadius: Radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  stepLabel: {
    flex: 1,
    lineHeight: 20,
  },
});
