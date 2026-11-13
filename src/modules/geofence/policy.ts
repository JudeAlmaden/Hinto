/**
 * Adaptive location policy (spec §7, plan Phase 4 task 3).
 *
 * The table is data, not behaviour: `selectPolicy` picks a tier from the
 * distance to the destination, then degrades it for battery constraints. Every
 * constant lives here so the watchdog and diagnostics can report the interval
 * actually in use.
 */

import type { AdaptivePolicy } from '@/modules/location';

export interface PolicyTier extends AdaptivePolicy {
  /** Applies while the destination is at or below this distance. */
  maxDistanceM: number;
}

/** Furthest tier last: the first match wins. */
export const POLICY_TABLE: readonly PolicyTier[] = [
  { maxDistanceM: 500, accuracy: 'highest', timeIntervalMs: 10_000, distanceIntervalM: 50 },
  { maxDistanceM: 1500, accuracy: 'high', timeIntervalMs: 15_000, distanceIntervalM: 100 },
  { maxDistanceM: 5000, accuracy: 'balanced', timeIntervalMs: 30_000, distanceIntervalM: 250 },
  {
    maxDistanceM: Number.POSITIVE_INFINITY,
    accuracy: 'balanced',
    timeIntervalMs: 60_000,
    distanceIntervalM: 500,
  },
] as const;

export const POLICY_TUNING = {
  /** Battery saving doubles the interval and distance filters. */
  batterySaverFactor: 2,
  /** Below this level Hinto becomes deliberately coarser. */
  lowBatteryPct: 15,
  lowBatteryFactor: 2,
  /** Standing still for this long halves the sampling rate. */
  stationaryMs: 120_000,
  stationaryFactor: 2,
  /** Never sample slower than this, however many factors apply. */
  maxIntervalMs: 120_000,
} as const;

const ACCURACY_ORDER: AdaptivePolicy['accuracy'][] = [
  'balanced',
  'high',
  'highest',
  'bestForNavigation',
];

function coarsen(accuracy: AdaptivePolicy['accuracy']): AdaptivePolicy['accuracy'] {
  const index = ACCURACY_ORDER.indexOf(accuracy);
  return ACCURACY_ORDER[Math.max(0, index - 1)];
}

export interface PolicyInput {
  /** Last known distance, or null before the first fix (use the furthest tier). */
  distanceM: number | null;
  batteryLevelPct: number | null;
  batterySaver: boolean;
  /** How long the device has been stationary, in ms. */
  stationaryMs: number;
}

export function selectPolicy(input: PolicyInput): AdaptivePolicy {
  const distance = input.distanceM === null ? Number.POSITIVE_INFINITY : Math.max(0, input.distanceM);
  const tier = POLICY_TABLE.find((candidate) => distance <= candidate.maxDistanceM) ?? POLICY_TABLE[POLICY_TABLE.length - 1];

  let factor = 1;
  let accuracy = tier.accuracy;

  if (input.batterySaver) {
    factor *= POLICY_TUNING.batterySaverFactor;
    accuracy = coarsen(accuracy);
  }

  if (input.batteryLevelPct !== null && input.batteryLevelPct <= POLICY_TUNING.lowBatteryPct) {
    factor *= POLICY_TUNING.lowBatteryFactor;
    accuracy = coarsen(accuracy);
  }

  if (input.stationaryMs >= POLICY_TUNING.stationaryMs) {
    factor *= POLICY_TUNING.stationaryFactor;
  }

  return {
    accuracy,
    timeIntervalMs: Math.min(POLICY_TUNING.maxIntervalMs, tier.timeIntervalMs * factor),
    distanceIntervalM: tier.distanceIntervalM * factor,
  };
}

/** Human-readable interval for the diagnostics inspector. */
export function describePolicy(policy: AdaptivePolicy): string {
  return `${policy.accuracy} · ${Math.round(policy.timeIntervalMs / 1000)} s · ${policy.distanceIntervalM} m`;
}
