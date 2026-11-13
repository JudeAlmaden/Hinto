/**
 * History projections (plan Phase 8).
 *
 * Pure functions from rows to display models, so the History list and its
 * detail screen share one definition of "alerted", "dismissed" and "snoozed".
 */

import type { Journey, JourneyAlert } from '@/modules/journeys';

import type { JourneySummary } from '.';

export function summariseJourney(journey: Journey, alerts: readonly JourneyAlert[]): JourneySummary {
  const firstAlert = alerts[0] ?? null;
  const durationMs =
    journey.startedAt !== null && journey.endedAt !== null
      ? journey.endedAt - journey.startedAt
      : null;

  return {
    id: journey.id,
    destinationName: journey.destinationName,
    startedAt: journey.startedAt ?? journey.createdAt,
    endedAt: journey.endedAt,
    durationMs,
    radiusM: journey.radiusM,
    status: journey.status,
    alertType: firstAlert?.alertType ?? null,
    triggerDistanceM: firstAlert?.triggerDistanceM ?? null,
    finalDistanceM: journey.lastKnownDistanceM,
  };
}

/** Newest first, grouped by day for the section list. */
export function groupSummaries(
  summaries: readonly JourneySummary[],
  now = Date.now(),
): { bucket: 'today' | 'yesterday' | 'earlier'; items: JourneySummary[] }[] {
  const buckets: ('today' | 'yesterday' | 'earlier')[] = ['today', 'yesterday', 'earlier'];
  const groups = buckets.map((bucket) => ({ bucket, items: [] as JourneySummary[] }));

  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const todayStart = startOfToday.getTime();
  const yesterdayStart = todayStart - 86_400_000;

  for (const summary of summaries) {
    if (summary.startedAt >= todayStart) groups[0].items.push(summary);
    else if (summary.startedAt >= yesterdayStart) groups[1].items.push(summary);
    else groups[2].items.push(summary);
  }

  return groups.filter((group) => group.items.length > 0);
}

export function countAlerts(summaries: readonly JourneySummary[]): number {
  return summaries.filter((summary) => summary.alertType !== null).length;
}

/** "alerted 1.0 km · dismissed" / "no alert · ended manually". */
export function describeOutcome(
  summary: JourneySummary,
  copy: { alerted: string; noAlert: string; dismissed: string; snoozed: string; interrupted: string; cancelled: string },
): string {
  if (summary.status === 'interrupted') return copy.interrupted;
  if (summary.status === 'cancelled') return copy.cancelled;
  if (summary.alertType === null) return copy.noAlert;
  const descriptor = summary.alertType === 'snooze' ? copy.snoozed : copy.dismissed;
  return copy.alerted.replace('{distance}', '').trim() + ` · ${descriptor}`;
}
