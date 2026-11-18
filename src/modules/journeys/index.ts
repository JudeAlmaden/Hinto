/**
 * Journeys — lifecycle and persistence (spec §4.5, §10).
 *
 * A journey always stores a destination snapshot so later edits or deletion of
 * the source place cannot change an in-flight journey (spec §4.3).
 */

export type JourneyStatus =
  | 'prepared'
  | 'active'
  | 'paused'
  | 'triggered'
  | 'completed'
  | 'cancelled'
  | 'interrupted';

export interface Journey {
  id: string;
  placeId: string | null;
  destinationName: string;
  destinationLatitude: number;
  destinationLongitude: number;
  radiusM: number;
  status: JourneyStatus;
  startedAt: number | null;
  triggeredAt: number | null;
  endedAt: number | null;
  lastLocationAt: number | null;
  lastKnownDistanceM: number | null;
  /** Distance at the first trustworthy sample — the progress bar's baseline. */
  startDistanceM: number | null;
  alarmDismissedAt: number | null;
  /** First trustworthy sample inside the radius — drives the D9 alert-delay metric. */
  enteredRadiusAt: number | null;
  startBatteryPct: number | null;
  endBatteryPct: number | null;
  createdAt: number;
}

/** Extra warning stages, e.g. 3 km *and* 1 km (spec §4.4). */
export interface JourneyAlertRule {
  id: string;
  journeyId: string;
  radiusM: number;
  stageIndex: number;
}

export type AlertType = 'primary' | 'earlier' | 'snooze';

export interface JourneyAlert {
  id: string;
  journeyId: string;
  alertType: AlertType;
  stageIndex: number;
  triggerDistanceM: number;
  accuracyM: number | null;
  triggeredAt: number;
  dismissedAt: number | null;
  snoozedUntil: number | null;
}

/** Terminal-state rules (Phase 7). */
export const TERMINAL_STATUSES: readonly JourneyStatus[] = [
  'completed',
  'cancelled',
  'interrupted',
] as const;
