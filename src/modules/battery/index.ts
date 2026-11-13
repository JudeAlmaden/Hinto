/**
 * Battery — level sampling, saving mode and the restriction heuristic
 * (spec §7, plan D7).
 *
 * `heuristics.ts` (Phase 5) will hold the pure cadence-gap rule; nothing here
 * may call a native API.
 */

export type BatteryRestrictionSignal = 'none' | 'suspected' | 'confirmed-unavailable';

export interface BatterySnapshot {
  levelPct: number | null;
  isLow: boolean;
  charging: boolean;
  restriction: BatteryRestrictionSignal;
  /** `getProviderStatusAsync().backgroundModeEnabled === false` (D7). */
  backgroundModeDisabled: boolean;
}
