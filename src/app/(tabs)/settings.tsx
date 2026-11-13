import Constants from 'expo-constants';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton, Card, NavRow, SectionLabel, ToggleRow } from '@/components/ui/controls';
import { confirmAction } from '@/components/ui/confirm';
import { ResetStorageDialog } from '@/components/ui/reset-dialog';
import { Screen } from '@/components/ui/screen';
import { formatCopy, strings } from '@/constants/strings';
import { RADIUS_PRESETS_M } from '@/constants/alarms';
import { Spacing } from '@/constants/theme';
import { getDatabase, resetStorage, retryStorage } from '@/db/client';
import { useSettings } from '@/hooks/use-settings';
import { useStorage } from '@/hooks/use-storage';
import type { ReadinessIssue } from '@/modules/permissions';
import { getReadinessIssues } from '@/modules/permissions/service';
import { clearJourneyHistory, deleteAllData } from '@/modules/journeys/repository';
import { usePlacesStore } from '@/modules/places/store';
import { clearDiagnosticEvents } from '@/modules/diagnostics/repository';
import { formatRadius } from '@/utils/format';

export default function SettingsScreen() {
  const router = useRouter();
  const storage = useStorage();
  const { settings, update } = useSettings();
  const loadPlaces = usePlacesStore((state) => state.load);

  const [issues, setIssues] = useState<ReadinessIssue[]>([]);
  const [resetVisible, setResetVisible] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void getReadinessIssues()
        .then(setIssues)
        .catch(() => undefined);
    }, []),
  );

  const version = Constants.expoConfig?.version ?? '0.0.0';
  const issueCount = issues.length;

  const pickRadius = () => {
    Alert.alert(strings.settings.defaultRadius, undefined, [
      ...RADIUS_PRESETS_M.map((preset) => ({
        text: formatRadius(preset, settings.distance_unit),
        onPress: () => void update({ default_radius_m: preset }),
      })),
      { text: strings.common.cancel, style: 'cancel' as const },
    ]);
  };

  const pickSnooze = () => {
    Alert.alert(strings.settings.snoozeDuration, undefined, [
      ...[2, 5, 10, 15].map((minutes) => ({
        text: formatCopy(strings.settings.minutes, { minutes }),
        onPress: () => void update({ snooze_minutes: minutes }),
      })),
      { text: strings.common.cancel, style: 'cancel' as const },
    ]);
  };

  const pickUnit = () => {
    Alert.alert(strings.settings.distanceUnit, undefined, [
      { text: 'Kilometres', onPress: () => void update({ distance_unit: 'km' }) },
      { text: 'Miles', onPress: () => void update({ distance_unit: 'mi' }) },
      { text: strings.common.cancel, style: 'cancel' },
    ]);
  };

  return (
    <Screen title={strings.settings.title} tabInset>
      {storage.state === 'unavailable' ? (
        <Card style={styles.storageCard}>
          <ThemedText type="small">{strings.diagnostics.storageUnavailable}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {storage.error ?? ''}
          </ThemedText>
          <View style={styles.storageActions}>
            <AppButton
              label={strings.common.retry}
              variant="secondary"
              onPress={() => void retryStorage()}
              style={styles.storageAction}
            />
            <AppButton
              label={strings.diagnostics.resetStorage}
              variant="ghost"
              onPress={() => setResetVisible(true)}
              style={styles.storageAction}
            />
          </View>
        </Card>
      ) : null}

      <SectionLabel>{strings.settings.planning}</SectionLabel>
      <View>
        <NavRow
          label={strings.settings.defaultRadius}
          value={formatRadius(settings.default_radius_m, settings.distance_unit)}
          onPress={pickRadius}
        />
        <NavRow
          label={strings.settings.alarmSound}
          value={settings.alarm_sound_id}
          onPress={() => router.push('/settings/sound')}
        />
        <ToggleRow
          label={strings.settings.vibration}
          value={settings.vibration_enabled}
          onValueChange={(value) => void update({ vibration_enabled: value })}
        />
        <ToggleRow
          label={strings.settings.repeatUntilDismissed}
          value={settings.repeat_until_dismissed}
          onValueChange={(value) => void update({ repeat_until_dismissed: value })}
        />
        <NavRow
          label={strings.settings.snoozeDuration}
          value={formatCopy(strings.settings.minutes, { minutes: settings.snooze_minutes })}
          onPress={pickSnooze}
        />
        <ToggleRow
          label={strings.settings.preventAccidental}
          description={strings.settings.preventAccidentalNote}
          value={settings.require_hold_to_dismiss}
          onValueChange={(value) => void update({ require_hold_to_dismiss: value })}
          last
        />
      </View>

      <SectionLabel>{strings.settings.reliability}</SectionLabel>
      <View>
        <NavRow
          label={strings.settings.permissions}
          value={
            issueCount > 0
              ? formatCopy(issueCount === 1 ? strings.settings.issue : strings.settings.issues, {
                  count: issueCount,
                })
              : strings.settings.noIssues
          }
          onPress={() => router.push('/settings/permissions')}
        />
        <NavRow label={strings.settings.testAlarm} onPress={() => router.push('/alarm-test')} />
        <ToggleRow
          label={strings.settings.batterySaver}
          description={strings.settings.batterySaverNote}
          value={settings.battery_saver}
          onValueChange={(value) => void update({ battery_saver: value })}
        />
        <NavRow
          label={strings.settings.diagnostics}
          onPress={() => router.push('/settings/diagnostics')}
          last
        />
      </View>

      <SectionLabel>{strings.settings.display}</SectionLabel>
      <View>
        <NavRow
          label={strings.settings.distanceUnit}
          value={settings.distance_unit === 'mi' ? 'Miles' : 'Kilometres'}
          onPress={pickUnit}
          last
        />
      </View>

      <SectionLabel>{strings.settings.data}</SectionLabel>
      <View>
        <NavRow
          label={strings.settings.clearHistory}
          onPress={() =>
            confirmAction({
              title: strings.history.clearTitle,
              body: strings.history.clearBody,
              confirmLabel: strings.history.clearHistory,
              destructive: true,
              onConfirm: () => {
                void (async () => {
                  const db = await getDatabase();
                  await clearJourneyHistory(db);
                })();
              },
            })
          }
        />
        <NavRow
          label={strings.settings.deleteAll}
          danger
          onPress={() =>
            confirmAction({
              title: strings.settings.deleteAllTitle,
              body: strings.settings.deleteAllBody,
              confirmLabel: strings.common.delete,
              destructive: true,
              onConfirm: () => {
                void (async () => {
                  const db = await getDatabase();
                  await deleteAllData(db);
                  await clearDiagnosticEvents(db);
                  await loadPlaces(true);
                })();
              },
            })
          }
        />
        <NavRow
          label={strings.settings.resetLocal}
          danger
          onPress={() => setResetVisible(true)}
          last
        />
      </View>

      <Pressable
        onPress={() => router.push('/onboarding/welcome')}
        style={({ pressed }) => [styles.onboarding, pressed && { opacity: 0.6 }]}>
        <ThemedText type="small">{strings.settings.replayOnboarding}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {strings.settings.replay} ›
        </ThemedText>
      </Pressable>

      <ThemedText type="small" themeColor="textSecondary" style={styles.version}>
        {formatCopy(strings.settings.about, { version })}
      </ThemedText>

      <ResetStorageDialog
        visible={resetVisible}
        onCancel={() => setResetVisible(false)}
        onConfirm={() => {
          setResetVisible(false);
          void resetStorage().catch(() => undefined);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  storageCard: {
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  storageActions: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  storageAction: {
    flex: 1,
  },
  onboarding: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.three,
  },
  version: {
    textAlign: 'center',
  },
});
