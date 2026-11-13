import { MAX_RADIUS_M, RADIUS_PRESETS_M } from '@/constants/alarms';

/**
 * The suggested earlier warning: the next preset above the primary radius, or
 * double it once past the widest preset. Always inside the validation bounds.
 */
export function suggestedEarlierRadius(primaryRadiusM: number): number {
  const wider = [...RADIUS_PRESETS_M].sort((a, b) => a - b).find((preset) => preset > primaryRadiusM);
  if (wider) return wider;
  return Math.min(MAX_RADIUS_M, primaryRadiusM * 2);
}
