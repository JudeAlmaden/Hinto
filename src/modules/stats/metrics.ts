/**
 * On-device metrics (plan D9). No analytics SDK, no network, no coordinates.
 *
 * Every metric is `null` when its inputs are missing, and the UI shows `n/a`
 * rather than a number it cannot defend.
 */

import type { Journey, JourneyAlert } from '@/modules/journeys';

export const METRICS_WINDOW_DAYS = 30;

/** Journeys shorter than this are excluded from the battery-per-hour metric. */
export const MIN_BATTERY_SAMPLE_MS = 15 * 60_000;

export interface Metrics {
  journeyStartRate: number | null;
  alertSuccessRate: number | null;
  medianAlertDelayMs: number | null;
  missedAlerts: number | null;
  duplicateAlerts: number | null;
  batteryPerHourPct: number | null;
  savedPlaceReuseRate: number | null;
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return numerator / denominator;
}

function median(values: readonly number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/** Only alerts that actually rang count; snoozes repeat a real alert. */
function primaryAlerts(alerts: readonly JourneyAlert[]): JourneyAlert[] {
  return alerts.filter((alert) => alert.alertType !== 'snooze');
}

export function computeMetrics(
  journeys: readonly Journey[],
  alerts: readonly JourneyAlert[],
  now = Date.now(),
  windowDays = METRICS_WINDOW_DAYS,
): Metrics {
  const windowStart = now - windowDays * 86_400_000;
  const inWindow = journeys.filter((journey) => journey.createdAt >= windowStart);
  const alertsByJourney = new Map<string, JourneyAlert[]>();
  for (const alert of alerts) {
    const list = alertsByJourney.get(alert.journeyId) ?? [];
    list.push(alert);
    alertsByJourney.set(alert.journeyId, list);
  }

  const started = inWindow.filter((journey) => journey.startedAt !== null);
  const finished = inWindow.filter(
    (journey) => journey.status === 'completed' || journey.status === 'cancelled',
  );

  const finishedWithAlerts = finished.filter(
    (journey) => primaryAlerts(alertsByJourney.get(journey.id) ?? []).length > 0,
  );

  const delays: number[] = [];
  for (const journey of inWindow) {
    const first = primaryAlerts(alertsByJourney.get(journey.id) ?? [])[0];
    if (first && journey.enteredRadiusAt !== null) {
      delays.push(Math.max(0, first.triggeredAt - journey.enteredRadiusAt));
    }
  }

  const missed = finished.filter((journey) => {
    if (journey.lastKnownDistanceM === null) return false;
    return (
      journey.lastKnownDistanceM <= journey.radiusM &&
      primaryAlerts(alertsByJourney.get(journey.id) ?? []).length === 0
    );
  });

  const duplicates = inWindow.filter(
    (journey) => primaryAlerts(alertsByJourney.get(journey.id) ?? []).length > 1,
  );

  const batteryRates: number[] = [];
  for (const journey of inWindow) {
    if (
      journey.startBatteryPct === null ||
      journey.endBatteryPct === null ||
      journey.startedAt === null ||
      journey.endedAt === null
    ) {
      continue;
    }
    const durationMs = journey.endedAt - journey.startedAt;
    if (durationMs < MIN_BATTERY_SAMPLE_MS) continue;
    batteryRates.push((journey.startBatteryPct - journey.endBatteryPct) / (durationMs / 3_600_000));
  }

  const reuse = inWindow.filter((journey) => journey.placeId !== null);

  return {
    journeyStartRate: ratio(started.length, inWindow.length),
    alertSuccessRate: ratio(finishedWithAlerts.length, finished.filter((j) => j.radiusM > 0).length),
    medianAlertDelayMs: median(delays),
    missedAlerts: finished.length === 0 ? null : missed.length,
    duplicateAlerts: inWindow.length === 0 ? null : duplicates.length,
    batteryPerHourPct: batteryRates.length === 0 ? null : median(batteryRates),
    savedPlaceReuseRate: ratio(reuse.length, inWindow.length),
  };
}
