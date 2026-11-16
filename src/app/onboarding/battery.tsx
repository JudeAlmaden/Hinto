import * as Device from 'expo-device';
import { useRouter } from 'expo-router';


import { ThemedText } from '@/components/themed-text';
import { OnboardingShell } from '@/components/onboarding-shell';
import { Card } from '@/components/ui/controls';
import { Stack } from '@/components/ui/layout';
import { Mascot } from '@/components/ui/mascot';
import { formatCopy, strings } from '@/constants/strings';
import { openBatterySettings } from '@/modules/permissions/service';

export default function BatteryOnboardingScreen() {
  const router = useRouter();
  const manufacturer = Device.manufacturer ?? 'Some';
  const model = Device.modelName ?? 'phones';

  return (
    <OnboardingShell
      step={6}
      title={strings.onboarding.batteryTitle}
      body={strings.onboarding.batteryBody}
      primaryLabel={strings.onboarding.openBatterySettings}
      onPrimary={() => void openBatterySettings()}
      secondaryLabel={strings.onboarding.batteryLater}
      onSecondary={() => router.push('/onboarding/alarm-test')}
      skipTo="/onboarding/ready">
      <Mascot expression="sleepy" height={96} />
      <Card>
        <Stack gap="two" py="three">
          <ThemedText type="smallBold">
            {formatCopy(strings.onboarding.batteryDetected, { manufacturer, model })}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Settings › Apps › Hinto › Battery
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {strings.onboarding.batteryTradeoff}
          </ThemedText>
        </Stack>
      </Card>
    </OnboardingShell>
  );
}

