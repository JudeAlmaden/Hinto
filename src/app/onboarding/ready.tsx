import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { OnboardingShell } from '@/components/onboarding-shell';
import { ReadinessChecklist, type ChecklistItem } from '@/components/ui/checklist';
import { strings } from '@/constants/strings';
import { ONBOARDING_VERSION } from '@/constants/app';
import { Spacing } from '@/constants/theme';
import { useSettings } from '@/hooks/use-settings';
import type { PermissionMap } from '@/modules/permissions';
import { areLocationServicesEnabled, readPermissions } from '@/modules/permissions/service';

export default function ReadyOnboardingScreen() {
  const router = useRouter();
  const { update } = useSettings();
  const [permissions, setPermissions] = useState<PermissionMap | null>(null);
  const [services, setServices] = useState(true);

  useEffect(() => {
    void Promise.all([readPermissions(), areLocationServicesEnabled()])
      .then(([nextPermissions, nextServices]) => {
        setPermissions(nextPermissions);
        setServices(nextServices);
      })
      .catch(() => undefined);
  }, []);

  const state = (granted: boolean): ChecklistItem['state'] => (granted ? 'ok' : 'warning');

  const items: ChecklistItem[] = [
    {
      key: 'foreground',
      label: `${strings.permissions.foreground} — ${
        permissions?.foregroundLocation.status === 'granted'
          ? strings.onboarding.granted
          : strings.permissions.notAsked
      }`,
      state: state(permissions?.foregroundLocation.status === 'granted'),
      onPress: () => router.push('/onboarding/location'),
    },
    {
      key: 'background',
      label: `${strings.permissions.background} — ${
        permissions?.backgroundLocation.status === 'granted'
          ? strings.onboarding.granted
          : strings.permissions.notAsked
      }`,
      state: state(permissions?.backgroundLocation.status === 'granted'),
      onPress: () => router.push('/onboarding/background'),
    },
    {
      key: 'notifications',
      label: `${strings.permissions.notifications} — ${
        permissions?.notifications.status === 'granted'
          ? strings.onboarding.granted
          : strings.permissions.notAsked
      }`,
      state: state(permissions?.notifications.status === 'granted'),
      onPress: () => router.push('/onboarding/notifications'),
    },
    {
      key: 'services',
      label: `${strings.permissions.locationServices} — ${
        services ? strings.permissions.enabled : strings.permissions.disabled
      }`,
      state: state(services),
    },
    {
      key: 'battery',
      label: `${strings.permissions.batteryOptimisation} — ${strings.onboarding.notReviewed}`,
      state: 'warning',
      onPress: () => router.push('/onboarding/battery'),
    },
  ];

  const finish = async () => {
    await update({ onboarding_version: ONBOARDING_VERSION });
    router.replace('/');
  };

  return (
    <OnboardingShell
      step={8}
      title={strings.onboarding.ready}
      body={strings.onboarding.readyBody}
      primaryLabel={strings.onboarding.startUsing}
      onPrimary={() => void finish()}>
      <View style={styles.list}>
        <ReadinessChecklist items={items} />
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  list: {
    alignSelf: 'stretch',
    paddingTop: Spacing.two,
  },
});
