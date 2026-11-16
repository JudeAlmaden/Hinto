import * as Device from 'expo-device';
import { useRouter, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { OnboardingShell } from '@/components/onboarding-shell';
import { Card } from '@/components/ui/controls';
import { Icon } from '@/components/ui/icon';
import { Row, Stack } from '@/components/ui/layout';
import { Mascot } from '@/components/ui/mascot';
import { formatCopy, strings } from '@/constants/strings';
import { useTheme } from '@/hooks/use-theme';
import type { SettingsDestination } from '@/modules/permissions/service';
import { isBatteryOptimisationOn, openBatterySettings } from '@/modules/permissions/service';

export default function BatteryOnboardingScreen() {
  const router = useRouter();
  const theme = useTheme();
  const rawManufacturer = Device.manufacturer ?? 'Your phone';
  const brand = rawManufacturer.toLowerCase();
  const model = Device.modelName ?? '';
  const [opened, setOpened] = useState<SettingsDestination | null>(null);
  const [optimised, setOptimised] = useState<boolean | null>(null);

  const isOppo = brand.includes('oppo') || brand.includes('realme') || brand.includes('oneplus');
  const isXiaomi = brand.includes('xiaomi') || brand.includes('redmi') || brand.includes('poco');
  const isSamsung = brand.includes('samsung');

  const next = () => router.push('/onboarding/alarm-test' as Href);

  const open = async () => {
    // Resolves when the user comes back, so the state below is always fresh.
    setOpened(await openBatterySettings());
    setOptimised(await isBatteryOptimisationOn());
  };

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
                {formatCopy(strings.onboarding.batteryDetected, { manufacturer: rawManufacturer, model })}
              </ThemedText>
            </Row>

            {isOppo ? (
              <Stack gap="one">
                <ThemedText type="small" themeColor="textSecondary">
                  In Hinto&apos;s App Info page, tap <ThemedText type="smallBold">Battery usage</ThemedText> and turn ON:
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.accent }}>
                  • Allow background activity
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.accent }}>
                  • Allow auto-launch
                </ThemedText>
              </Stack>
            ) : isXiaomi ? (
              <Stack gap="one">
                <ThemedText type="small" themeColor="textSecondary">
                  In Hinto&apos;s App Info page, turn ON:
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.accent }}>
                  • Autostart
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.accent }}>
                  • Battery saver › No restrictions
                </ThemedText>
              </Stack>
            ) : isSamsung ? (
              <Stack gap="one">
                <ThemedText type="small" themeColor="textSecondary">
                  In Hinto&apos;s App Info page:
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.accent }}>
                  • Battery › Unrestricted
                </ThemedText>
              </Stack>
            ) : (
              <Stack gap="one">
                <ThemedText type="small" themeColor="textSecondary">
                  In Hinto&apos;s App Info page:
                </ThemedText>
                <ThemedText type="small" style={{ color: theme.accent }}>
                  • Battery › Unrestricted / Don&apos;t optimize
                </ThemedText>
              </Stack>
            )}

            {optimised !== null ? (
              <Row gap="two" align="center">
                <Icon
                  name={optimised ? 'alert-circle-outline' : 'checkmark-circle-outline'}
                  size={18}
                  color={optimised ? theme.warning : theme.accent}
                />
                <ThemedText type="small" themeColor="textSecondary" style={styles.flexOne}>
                  {formatCopy(strings.onboarding.batteryState, {
                    state: optimised
                      ? strings.onboarding.batteryRestricted
                      : strings.onboarding.batteryUnrestricted,
                  })}
                </ThemedText>
              </Row>
            ) : null}
            <ThemedText type="small" themeColor="textSecondary">
              {strings.onboarding.batteryTradeoff}
            </ThemedText>
          </Stack>
        </Card>
      }
      title={strings.onboarding.batteryTitle}
      body={strings.onboarding.batteryBody}
      primaryLabel={
        opened ? strings.onboarding.continue : strings.onboarding.openBatterySettings
      }
      onPrimary={() => (opened ? next() : void open())}
      secondaryLabel={strings.onboarding.batteryLater}
      onSecondary={next}
      skipTo="/onboarding/ready"
    />
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
  },
  flexOne: {
    flex: 1,
  },
});
