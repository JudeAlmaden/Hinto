import * as Device from 'expo-device';
import { useRouter, type Href } from 'expo-router';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { OnboardingShell } from '@/components/onboarding-shell';
import { Card } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { Row, Stack } from '@/components/ui/layout';
import { Mascot } from '@/components/ui/mascot';
import { formatCopy, strings } from '@/constants/strings';
import { useTheme } from '@/hooks/use-theme';
import { openBatterySettings } from '@/modules/permissions/service';

export default function BatteryOnboardingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const manufacturer = Device.manufacturer ?? 'Some';
  const model = Device.modelName ?? 'phones';

  return (
    <OnboardingShell
      step={6}
      hero={<Mascot expression="sleepy" height={110} />}
      topSlot={
        <Card style={styles.card}>
          <Stack gap="two" py="two">
            <Row gap="two" align="center">
              <Icon name="hardware-chip-outline" size={18} color={theme.accent} />
              <ThemedText type="smallBold">
                {formatCopy(strings.onboarding.batteryDetected, { manufacturer, model })}
              </ThemedText>
            </Row>
            <ThemedText type="small" themeColor="textSecondary">
              Settings › Apps › Hinto › Battery
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {'If an app list appears, change filter from "Not optimized" to "All apps" to find Hinto.'}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {strings.onboarding.batteryTradeoff}
            </ThemedText>
          </Stack>
        </Card>
      }
      title={strings.onboarding.batteryTitle}
      body={strings.onboarding.batteryBody}
      primaryLabel={strings.onboarding.openBatterySettings}
      onPrimary={() => void openBatterySettings()}
      secondaryLabel={strings.onboarding.batteryLater}
      onSecondary={() => router.push('/onboarding/auto-start' as Href)}
      skipTo="/onboarding/ready"
    />
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
});
