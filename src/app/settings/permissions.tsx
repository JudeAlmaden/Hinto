import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Card, NavRow, SectionLabel } from '@/components/ui/controls';
import { Screen } from '@/components/ui/screen';
import { strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { useTracking } from '@/hooks/use-tracking';
import type { PermissionMap } from '@/modules/permissions';
import {
  areLocationServicesEnabled,
  isBatteryOptimisationOn,
  openAppSettings,
  openBatterySettings,
  openLocationSettings,
  readPermissions,
  requestPermission,
} from '@/modules/permissions/service';

type State = {
  permissions: PermissionMap | null;
  services: boolean;
  batteryOptimisation: boolean;
};

export default function PermissionsScreen() {
  const tracking = useTracking();
  const [state, setState] = useState<State>({
    permissions: null,
    services: true,
    batteryOptimisation: false,
  });

  const refresh = useCallback(async () => {
    const [permissions, services, batteryOptimisation] = await Promise.all([
      readPermissions(),
      areLocationServicesEnabled(),
      isBatteryOptimisationOn(),
    ]);
    setState({ permissions, services, batteryOptimisation });
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const permissions = state.permissions;
  const statusLabel = (status: 'granted' | 'denied' | 'undetermined') =>
    status === 'granted'
      ? strings.permissions.granted
      : status === 'denied'
        ? strings.permissions.denied
        : strings.permissions.notAsked;

  return (
    <Screen title={strings.permissions.title} back>
      <SectionLabel>{strings.permissions.title}</SectionLabel>
      <View>
        <NavRow
          label={strings.permissions.foreground}
          value={
            permissions
              ? statusLabel(permissions.foregroundLocation.status)
              : strings.common.loading
          }
          onPress={() =>
            void requestPermission('foregroundLocation').then(refresh)
          }
        />
        <NavRow
          label={strings.permissions.background}
          value={
            permissions
              ? statusLabel(permissions.backgroundLocation.status)
              : strings.common.loading
          }
          onPress={() => void requestPermission('backgroundLocation').then(refresh)}
        />
        <NavRow
          label={strings.permissions.notifications}
          value={
            permissions ? statusLabel(permissions.notifications.status) : strings.common.loading
          }
          onPress={() => void requestPermission('notifications').then(refresh)}
        />
        <NavRow
          label={strings.permissions.locationServices}
          value={state.services ? strings.permissions.enabled : strings.permissions.disabled}
          onPress={() => void openLocationSettings()}
          last
        />
      </View>

      <SectionLabel>{strings.settings.reliability}</SectionLabel>
      <View>
        <NavRow
          label={strings.permissions.batteryOptimisation}
          value={state.batteryOptimisation ? strings.permissions.enabled : strings.permissions.disabled}
          onPress={() => void openBatterySettings()}
        />
        <NavRow
          label={strings.permissions.openSettings}
          onPress={() => void openAppSettings()}
          last
        />
      </View>

      {tracking.restrictionSuspected ? (
        <Card style={styles.card}>
          <ThemedText type="small" style={styles.warning}>
            {strings.permissions.batteryRestricted}
          </ThemedText>
        </Card>
      ) : (
        <ThemedText type="small" themeColor="textSecondary" style={styles.statusNote}>
          {strings.permissions.batteryOk}
        </ThemedText>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  warning: {
    color: '#F5A623',
  },
  statusNote: {
    paddingTop: Spacing.two,
  },
});
