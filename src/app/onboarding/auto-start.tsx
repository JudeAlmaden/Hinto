import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { OnboardingShell } from '@/components/onboarding-shell';
import { Card } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { Row, Stack } from '@/components/ui/layout';
import { Mascot } from '@/components/ui/mascot';
import { formatCopy, strings } from '@/constants/strings';
import { useTheme } from '@/hooks/use-theme';
import { openAutoStartSettings } from '@/modules/permissions/service';

export default function AutoStartOnboardingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const manufacturer = Device.manufacturer ?? 'Your phone';
  const model = Device.modelName ?? '';

  return (
    <OnboardingShell
      step={7}
      hero={<Mascot expression="sleepy" height={110} />}
      topSlot={
        <Card style={styles.card}>
          <Stack gap="two" py="two">
            <Row gap="two" align="center">
              <Icon name="flash-outline" size={18} color={theme.accent} />
              <ThemedText type="smallBold">
                {formatCopy(strings.onboarding.autoStartDetected, { manufacturer, model })}
              </ThemedText>
            </Row>
            <ThemedText type="small" themeColor="textSecondary">
              {strings.onboarding.autoStartManual}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {strings.onboarding.autoStartManualOppo}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {'If you do not see it, search "Auto start" in your phone\'s Settings search bar.'}
            </ThemedText>
          </Stack>
        </Card>
      }
      title={strings.onboarding.autoStartTitle}
      body={strings.onboarding.autoStartBody}
      note={strings.onboarding.autoStartNote}
      primaryLabel={strings.onboarding.openAutoStartSettings}
      onPrimary={() => void openAutoStartSettings()}
      secondaryLabel={strings.onboarding.autoStartLater}
      onSecondary={() => router.push('/onboarding/alarm-test')}
      skipTo="/onboarding/ready"
    />
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
});

