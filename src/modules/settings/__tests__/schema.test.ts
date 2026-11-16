import { describe, expect, it } from '@jest/globals';

import {
  DEFAULT_SETTINGS,
  SETTING_KEYS,
  decodeSettingValue,
  encodeSettingValue,
  parseSettings,
} from '../schema';

describe('settings defaults (D5)', () => {
  it('matches the closed key set in the decision register', () => {
    expect(DEFAULT_SETTINGS).toEqual({
      default_radius_m: 1000,
      alarm_sound_id: 'classic',
      custom_alarm_uri: null,
      appearance: 'light',
      vibration_enabled: true,
      vibration_repeat: true,
      repeat_until_dismissed: true,
      snooze_minutes: 5,
      require_hold_to_dismiss: true,
      battery_saver: false,
      distance_unit: 'km',
      onboarding_version: 0,
    });
  });

  it('exposes every key exactly once', () => {
    expect(new Set(SETTING_KEYS).size).toBe(SETTING_KEYS.length);
    expect(SETTING_KEYS.sort()).toEqual(Object.keys(DEFAULT_SETTINGS).sort());
  });
});

describe('parseSettings (D5)', () => {
  it('accepts a custom alarm sound and its file', () => {
    const { settings, invalid } = parseSettings({
      alarm_sound_id: 'custom',
      custom_alarm_uri: 'file:///data/alarm-sounds/alarm-1.m4a',
    });
    expect(settings.alarm_sound_id).toBe('custom');
    expect(settings.custom_alarm_uri).toBe('file:///data/alarm-sounds/alarm-1.m4a');
    expect(invalid).toEqual([]);
  });

  it('returns defaults for an empty record', () => {
    const { settings, invalid } = parseSettings({});
    expect(settings).toEqual(DEFAULT_SETTINGS);
    expect(invalid).toEqual([]);
  });

  it('applies stored values over the defaults', () => {
    const { settings, invalid } = parseSettings({
      default_radius_m: 3000,
      distance_unit: 'mi',
      vibration_enabled: false,
    });

    expect(settings.default_radius_m).toBe(3000);
    expect(settings.distance_unit).toBe('mi');
    expect(settings.vibration_enabled).toBe(false);
    expect(settings.snooze_minutes).toBe(5);
    expect(invalid).toEqual([]);
  });

  it('falls back per key and reports the value it could not use', () => {
    const { settings, invalid } = parseSettings({
      default_radius_m: 10,
      snooze_minutes: 'soon',
      distance_unit: 'yards',
      onboarding_version: 1,
    });

    expect(settings.default_radius_m).toBe(DEFAULT_SETTINGS.default_radius_m);
    expect(settings.snooze_minutes).toBe(DEFAULT_SETTINGS.snooze_minutes);
    expect(settings.distance_unit).toBe('km');
    expect(settings.onboarding_version).toBe(1);
    expect(invalid.sort()).toEqual(['default_radius_m', 'distance_unit', 'snooze_minutes']);
  });

  it('ignores unknown keys instead of failing', () => {
    const { settings, invalid } = parseSettings({ future_flag: true, alarm_sound_id: 'chime' });
    expect(settings.alarm_sound_id).toBe('chime');
    expect(invalid).toEqual([]);
    expect(settings).not.toHaveProperty('future_flag');
  });
});

describe('setting value encoding (D5)', () => {
  it('round-trips booleans, numbers and strings', () => {
    expect(decodeSettingValue(encodeSettingValue('vibration_enabled', false))).toBe(false);
    expect(decodeSettingValue(encodeSettingValue('snooze_minutes', 10))).toBe(10);
    expect(decodeSettingValue(encodeSettingValue('alarm_sound_id', 'beep'))).toBe('beep');
  });

  it('refuses to encode a value the schema rejects', () => {
    expect(() => encodeSettingValue('default_radius_m', 50)).toThrow(/default_radius_m/);
    expect(() => encodeSettingValue('snooze_minutes', 0)).toThrow(/snooze_minutes/);
  });

  it('treats unreadable JSON as missing', () => {
    expect(decodeSettingValue('not json')).toBeUndefined();
  });
});
