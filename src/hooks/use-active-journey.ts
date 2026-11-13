import { useEffect } from 'react';

import { getDatabase } from '@/db/client';
import { useAsyncData } from '@/hooks/use-async';
import type { AdaptivePolicy } from '@/modules/location';
import { refreshJourneySession } from '@/modules/location/session';
import { selectPolicy } from '@/modules/geofence/policy';
import type { Journey, JourneyAlert, JourneyAlertRule } from '@/modules/journeys';
import { getLatestJourneyAlert, listAlertRules } from '@/modules/journeys/repository';
import { readBattery } from '@/modules/battery/service';
import type { AppSettings } from '@/modules/settings/schema';
import { getSettings } from '@/modules/settings/repository';

export interface ActiveJourneyData {
  journey: Journey | null;
  latestAlert: JourneyAlert | null;
  rules: JourneyAlertRule[];
  settings: AppSettings;
  policy: AdaptivePolicy;
}

/** Home and the journey screen share this: DB truth plus the watchdog tick. */
export function useActiveJourney(pollMs = 5000) {
  const state = useAsyncData<ActiveJourneyData>(async () => {
    const db = await getDatabase();
    const journey = await refreshJourneySession();
    const [settings, battery] = await Promise.all([getSettings(db), readBattery()]);
    const rules = journey ? await listAlertRules(db, journey.id) : [];
    const latestAlert = journey ? await getLatestJourneyAlert(db, journey.id) : null;

    return {
      journey,
      latestAlert,
      rules,
      settings,
      policy: selectPolicy({
        distanceM: journey?.lastKnownDistanceM ?? null,
        batteryLevelPct: battery.levelPct,
        batterySaver: settings.battery_saver,
        stationaryMs: 0,
      }),
    };
  }, 'active-journey');

  useEffect(() => {
    const timer = setInterval(state.reload, pollMs);
    return () => clearInterval(timer);
  }, [pollMs, state.reload]);

  return state;
}
