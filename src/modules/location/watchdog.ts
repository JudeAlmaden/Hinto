/**
 * Freshness watchdog (plan D14, Phase 5 task 4).
 *
 * One source of truth for "tracking", "waiting", "stale" and "interrupted". The
 * same thresholds feed the Home card, the journey screen and the recovery path,
 * so no screen invents its own timeout.
 */

import { FRESHNESS } from '@/constants/alarms';
import type { TrackingStatus } from '.';

export const WATCHDOG = {
  waitingMs: FRESHNESS.waitingMs,
  staleMs: FRESHNESS.staleMs,
  interruptedMs: FRESHNESS.interruptedMs,
} as const;

export interface TrackingStatusInput {
  /** Timestamp of the last sample, or null when none arrived yet. */
  lastSampleAt: number | null;
  now: number;
  paused: boolean;
  /** True when no updates were requested at all (no active journey). */
  idle: boolean;
}

export function deriveTrackingStatus(input: TrackingStatusInput): TrackingStatus {
  if (input.idle) return 'idle';
  if (input.paused) return 'paused';
  if (input.lastSampleAt === null) return 'waiting';

  const age = input.now - input.lastSampleAt;
  if (age >= WATCHDOG.staleMs) return 'stale';
  if (age >= WATCHDOG.waitingMs) return 'waiting';
  return 'tracking';
}

/** After this long without a sample the journey is no longer "active" (D14). */
export function shouldInterrupt(lastSampleAt: number | null, now: number): boolean {
  if (lastSampleAt === null) return false;
  return now - lastSampleAt >= WATCHDOG.interruptedMs;
}

/** "updated 4s ago" / "last seen 2m ago" for the journey surfaces. */
export function describeSampleAge(lastSampleAt: number | null, now: number): string {
  if (lastSampleAt === null) return 'never';
  const seconds = Math.max(0, Math.round((now - lastSampleAt) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}
