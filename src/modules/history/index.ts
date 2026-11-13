/**
 * History — completed journey records (spec §4.7, plan Phase 8).
 */

import type { AlertType, JourneyStatus } from '@/modules/journeys';

export interface JourneySummary {
  id: string;
  destinationName: string;
  startedAt: number;
  endedAt: number | null;
  durationMs: number | null;
  radiusM: number;
  status: JourneyStatus;
  alertType: AlertType | null;
  triggerDistanceM: number | null;
  finalDistanceM: number | null;
}

export type HistoryGroup = 'today' | 'yesterday' | 'earlier';
