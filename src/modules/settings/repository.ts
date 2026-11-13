/**
 * Settings storage (plan D5). All access goes through the Zod schema so callers
 * always see a complete, validated object.
 */

import type { SqlDatabase } from '@/db/types';
import { capture } from '@/modules/diagnostics';

import {
  type AppSettings,
  type SettingKey,
  decodeSettingValue,
  encodeSettingValue,
  parseSettings,
} from './schema';

interface SettingRow {
  key: string;
  value: string;
}

export async function getSettings(db: SqlDatabase): Promise<AppSettings> {
  const rows = await db.getAllAsync<SettingRow>('SELECT key, value FROM settings');
  const record: Record<string, unknown> = {};
  for (const row of rows) {
    record[row.key] = decodeSettingValue(row.value);
  }

  const { settings, invalid } = parseSettings(record);
  if (invalid.length > 0) {
    capture('settings', 'settings_invalid_value', { keys: invalid.join(',') });
  }
  return settings;
}

export async function setSetting<K extends SettingKey>(
  db: SqlDatabase,
  key: K,
  value: AppSettings[K],
): Promise<void> {
  const encoded = encodeSettingValue(key, value);
  await db.runAsync(
    `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
    key,
    encoded,
    Date.now(),
  );
}

/** Writes only the provided keys, in one transaction. */
export async function setSettings(
  db: SqlDatabase,
  patch: Partial<AppSettings>,
): Promise<void> {
  const encoded: [string, string][] = [];
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    encoded.push([key, encodeSettingValue(key as SettingKey, value)]);
  }
  if (encoded.length === 0) return;

  const now = Date.now();
  await db.withTransactionAsync(async () => {
    for (const [key, value] of encoded) {
      await db.runAsync(
        `INSERT INTO settings (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`,
        key,
        value,
        now,
      );
    }
  });
}
