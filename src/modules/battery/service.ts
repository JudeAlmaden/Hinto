/**
 * Battery level and power state (spec §7). The restriction *heuristic* is
 * separate and pure (`./heuristics.ts`); this module only reads the platform.
 */

import * as Battery from 'expo-battery';

import type { BatterySnapshot } from '.';

let lastLevel: number | null = null;

export async function readBattery(): Promise<BatterySnapshot> {
  try {
    const power = await Battery.getPowerStateAsync();
    const level = power.batteryLevel;
    lastLevel =
      typeof level === 'number' && level >= 0 ? Math.round(level * 100) : null;
    return {
      levelPct: lastLevel,
      isLow: lastLevel !== null && lastLevel <= 15,
      charging: power.batteryState === Battery.BatteryState.CHARGING,
      restriction: 'none',
      backgroundModeDisabled: false,
    };
  } catch {
    return {
      levelPct: null,
      isLow: false,
      charging: false,
      restriction: 'none',
      backgroundModeDisabled: false,
    };
  }
}

/** Cached last known level for the location engine, which runs every sample. */
export function getCachedBatteryLevel(): number | null {
  return lastLevel;
}
