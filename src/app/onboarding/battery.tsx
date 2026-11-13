import * as Device from 'expo-device';
import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { OnboardingShell } from '@/components/onboarding-shell';
import { Card } from '@/components/ui/controls';
import { formatCopy, strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
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
      <Card style={styles.card}>
        <ThemedText type="smallBold">
          {formatCopy(strings.onboarding.batteryDetected, { manufacturer, model })}
        </ThemedText>
        <View style={styles.row}>
          <ThemedText type="small" themeColor="textSecondary">
            Settings › Apps › Hinto › Battery
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {strings.onboarding.batteryTradeoff}
        </ThemedText>
      </Card>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  card: {
    alignSelf: 'stretch',
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
