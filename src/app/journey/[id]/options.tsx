import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { AppButton, Card, NavRow, ToggleRow } from '@/components/ui/controls';
import { RadiusPicker } from '@/components/ui/radius-picker';
import { Screen } from '@/components/ui/screen';
import { formatCopy, strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { getDatabase } from '@/db/client';
import { useAsyncData } from '@/hooks/use-async';
import { deliverAlarm } from '@/modules/alarm/delivery';
import type { Journey } from '@/modules/journeys';
import {
  addJourneyAlert,
  getJourney,
  listAlertRules,
  replaceAlertRules,
  updateJourney,
} from '@/modules/journeys/repository';
import { DEFAULT_SETTINGS, type AppSettings } from '@/modules/settings/schema';
import { getSettings } from '@/modules/settings/repository';
import { formatRadius } from '@/utils/format';
import { suggestedEarlierRadius } from '@/utils/radius';

export default function JourneyOptionsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const id = typeof params.id === 'string' ? params.id : '';

  const state = useAsyncData<{ journey: Journey | null; stagesM: number[]; settings: AppSettings }>(
    async () => {
      const db = await getDatabase();
      const [journey, settings] = await Promise.all([getJourney(db, id), getSettings(db)]);
      const rules = journey ? await listAlertRules(db, journey.id) : [];
      return {
        journey,
        stagesM: rules.length > 0 ? rules.map((rule) => rule.radiusM) : journey ? [journey.radiusM] : [],
        settings,
      };
    },
    `journey-options-${id}`,
  );

  const journey = state.data?.journey ?? null;
  const settings = state.data?.settings ?? DEFAULT_SETTINGS;

  const [radiusOverride, setRadius] = useState<number | null>(null);
  const [earlierOverride, setEarlier] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);

  const radius = radiusOverride ?? journey?.radiusM ?? null;
  const earlier = earlierOverride ?? (state.data?.stagesM.length ?? 1) > 1;

  if (!journey || radius === null) {
    return (
      <Screen title={strings.journey.options} back>
        <ThemedText type="small" themeColor="textSecondary">
          {strings.common.loading}
        </ThemedText>
      </Screen>
    );
  }

  const save = async () => {
    setSaving(true);
    try {
      const db = await getDatabase();
      const rules = earlier
        ? [
            { radiusM: suggestedEarlierRadius(radius), stageIndex: 0 },
            { radiusM: radius, stageIndex: 1 },
          ]
        : [{ radiusM: radius, stageIndex: 0 }];
      await replaceAlertRules(db, journey.id, rules);
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const simulate = async () => {
    if (!__DEV__) return;
    const db = await getDatabase();
    const distanceM = journey.lastKnownDistanceM ?? journey.radiusM / 2;
    const alert = await addJourneyAlert(db, {
      journeyId: journey.id,
      alertType: 'primary',
      stageIndex: 0,
      triggerDistanceM: distanceM,
      accuracyM: 12,
    });
    await updateJourney(db, journey.id, { status: 'triggered', triggeredAt: Date.now() });

    await deliverAlarm({
      journeyId: journey.id,
      alertId: alert.id,
      destinationName: journey.destinationName,
      distanceM,
      sound: settings.alarm_sound_id,
      snoozeMinutes: settings.snooze_minutes,
      vibration: settings.vibration_enabled,
      repeatUntilDismissed: settings.repeat_until_dismissed,
      stageIndex: 0,
      estimateOnly: false,
    });

    router.replace(`/alarm?journeyId=${journey.id}`);
  };

  return (
    <Screen title={strings.journey.options} back footer={<AppButton label={strings.common.save} onPress={() => void save()} loading={saving} />}>
      <Card style={styles.card}>
        <ThemedText style={styles.destination} numberOfLines={1}>
          {journey.destinationName}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {strings.journeySetup.alertDistance}
        </ThemedText>
        <RadiusPicker value={radius} onChange={setRadius} unit={settings.distance_unit} />
      </Card>

      <ToggleRow
        label={strings.journeySetup.earlierWarning}
        description={formatCopy(strings.journeySetup.earlierAt, {
          distance: formatRadius(suggestedEarlierRadius(radius), settings.distance_unit),
        })}
        value={earlier}
        onValueChange={setEarlier}
      />

      <View>
        <NavRow
          label={strings.settings.alarmSound}
          value={settings.alarm_sound_id}
          onPress={() => router.push('/settings/sound')}
        />
        <NavRow
          label={strings.settings.vibration}
          value={settings.vibration_enabled ? strings.permissions.enabled : strings.permissions.disabled}
          onPress={() => router.push('/settings')}
          last
        />
      </View>

      {__DEV__ ? (
        <Card style={styles.card}>
          <ThemedText type="small" themeColor="textSecondary">
            {strings.diagnostics.simulateBody}
          </ThemedText>
          <AppButton
            label={strings.diagnostics.simulate}
            variant="secondary"
            onPress={() => void simulate()}
          />
        </Card>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingVertical: Spacing.three,
    gap: Spacing.two,
  },
  destination: {
    fontSize: 18,
    fontWeight: '700',
  },
});
