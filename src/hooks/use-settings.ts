import { useCallback } from 'react';

import { getDatabase } from '@/db/client';
import type { AppSettings } from '@/modules/settings/schema';
import { DEFAULT_SETTINGS } from '@/modules/settings/schema';
import { getSettings, setSettings } from '@/modules/settings/repository';
import type { AsyncState } from '@/hooks/use-async';
import { useAsyncData } from '@/hooks/use-async';

export type SettingsState = AsyncState<AppSettings> & {
  settings: AppSettings;
  update: (patch: Partial<AppSettings>) => Promise<void>;
};

export function useSettings(): SettingsState {
  const state = useAsyncData(async () => {
    const db = await getDatabase();
    return getSettings(db);
  }, 'settings');

  const update = useCallback(
    async (patch: Partial<AppSettings>) => {
      const db = await getDatabase();
      await setSettings(db, patch);
      state.reload();
    },
    [state],
  );

  return { ...state, settings: state.data ?? DEFAULT_SETTINGS, update };
}
