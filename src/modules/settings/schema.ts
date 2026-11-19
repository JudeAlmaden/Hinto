/**
 * Settings contract (plan D5).
 *
 * The key set is closed: adding a key means adding it here with a default and a
 * CHANGELOG note. Values are JSON-encoded in the `settings` table, so numbers,
 * booleans and strings share one column and a new key needs no migration.
 *
 * Distances are stored canonically in metres; `distance_unit` is display-only,
 * so presets never drift when the unit changes.
 */

import { z } from 'zod';

import { DEFAULT_RADIUS_M, MAX_RADIUS_M, MIN_RADIUS_M } from '@/constants/alarms';

export const DISTANCE_UNITS = ['km', 'mi'] as const;
export type DistanceUnit = (typeof DISTANCE_UNITS)[number];
export const ALARM_SOUND_IDS = ['classic', 'chime', 'beep', 'custom'] as const;

/**
 * Release-notice bookkeeping: the version the user hid with "Not now", and the
 * one already announced by a notification, so neither repeats for that tag.
 */
export const updateCheckSchema = z.object({
  dismissed_version: z.string().nullable().default(null),
  notified_version: z.string().nullable().default(null),
});

export const appSettingsSchema = z.object({
  default_radius_m: z.number().int().min(MIN_RADIUS_M).max(MAX_RADIUS_M).default(DEFAULT_RADIUS_M),
  alarm_sound_id: z.enum(ALARM_SOUND_IDS).default('classic'),
  /** Local file URI copied into app storage; null until the user picks one. */
  custom_alarm_uri: z.string().nullable().default(null),
  appearance: z.enum(['system', 'light', 'dark']).default('light'),
  vibration_enabled: z.boolean().default(true),
  /** Repeat the pattern until the alarm is ended, instead of one short buzz. */
  vibration_repeat: z.boolean().default(true),
  repeat_until_dismissed: z.boolean().default(true),
  snooze_minutes: z.number().int().min(1).max(60).default(5),
  require_hold_to_dismiss: z.boolean().default(true),
  battery_saver: z.boolean().default(false),
  distance_unit: z.enum(DISTANCE_UNITS).default('km'),
  onboarding_version: z.number().int().min(0).default(0),
  update_check: updateCheckSchema.default({ dismissed_version: null, notified_version: null }),
});

export type AppSettings = z.infer<typeof appSettingsSchema>;
export type SettingKey = keyof AppSettings;
export type SettingValue<K extends SettingKey = SettingKey> = AppSettings[K];

export const DEFAULT_SETTINGS: AppSettings = appSettingsSchema.parse({});

export const SETTING_KEYS = Object.keys(DEFAULT_SETTINGS) as SettingKey[];

export function settingSchema<K extends SettingKey>(key: K) {
  return appSettingsSchema.shape[key];
}

export interface ParsedSettings {
  settings: AppSettings;
  /** Keys whose stored value failed validation and fell back to the default. */
  invalid: SettingKey[];
}

/**
 * Merges a raw key/value record over the defaults. Missing keys take their
 * default; invalid values fall back to the default and are reported so the
 * caller can emit `settings_invalid_value` (D5). Unknown keys are ignored.
 */
export function parseSettings(record: Record<string, unknown>): ParsedSettings {
  const settings: AppSettings = { ...DEFAULT_SETTINGS };
  const invalid: SettingKey[] = [];

  for (const key of SETTING_KEYS) {
    const raw = record[key];
    if (raw === undefined) continue;

    const parsed = settingSchema(key).safeParse(raw);
    if (parsed.success) {
      Object.assign(settings, { [key]: parsed.data });
    } else {
      invalid.push(key);
    }
  }

  return { settings, invalid };
}

/** Validates before encoding; throws so a bad write never reaches storage. */
export function encodeSettingValue<K extends SettingKey>(key: K, value: unknown): string {
  const parsed = settingSchema(key).safeParse(value);
  if (!parsed.success) {
    throw new Error(`Invalid value for setting "${key}".`);
  }
  return JSON.stringify(parsed.data);
}

/** Returns `undefined` for unreadable JSON so the caller falls back to defaults. */
export function decodeSettingValue(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return undefined;
  }
}
