/**
 * Diagnostics export (plan Phase 8 task 4).
 *
 * Aggregates and event names only: never coordinates, destination names or any
 * free text the user typed (D10, spec §11).
 */

import type { Metrics } from '@/modules/stats/metrics';

import type { DiagnosticEvent } from '.';

export interface ExportInput {
  events: readonly DiagnosticEvent[];
  metrics: Metrics;
  storage: { state: string; schemaVersion: number; integrityOk: boolean };
  appVersion: string;
}

function metricValue(value: number | null, format: (value: number) => string): string {
  return value === null ? 'n/a' : format(value);
}

export function buildDiagnosticsExport({ events, metrics, storage, appVersion }: ExportInput): string {
  const lines: string[] = [
    'Hinto diagnostics',
    `App version: ${appVersion}`,
    `Storage: ${storage.state} (schema v${storage.schemaVersion}, integrity ${storage.integrityOk ? 'ok' : 'failed'})`,
    '',
    'Metrics (last 30 days, aggregates only):',
    `  Journey start completion: ${metricValue(metrics.journeyStartRate, (value) => `${Math.round(value * 100)}%`)}`,
    `  Alert success rate: ${metricValue(metrics.alertSuccessRate, (value) => `${Math.round(value * 100)}%`)}`,
    `  Median alert delay: ${metricValue(metrics.medianAlertDelayMs, (value) => `${Math.round(value / 1000)} s`)}`,
    `  Missed alerts: ${metricValue(metrics.missedAlerts, String)}`,
    `  Duplicate alerts: ${metricValue(metrics.duplicateAlerts, String)}`,
    `  Battery per hour: ${metricValue(metrics.batteryPerHourPct, (value) => `${value.toFixed(1)}%/h`)}`,
    `  Saved-place reuse: ${metricValue(metrics.savedPlaceReuseRate, (value) => `${Math.round(value * 100)}%`)}`,
    '',
    'Recent events:',
    ...events
      .slice(0, 100)
      .map(
        (event) =>
          `  ${new Date(event.timestamp).toISOString()} ${event.kind}/${event.name}${
            event.meta ? ` ${JSON.stringify(event.meta)}` : ''
          }`,
      ),
    '',
    'Coordinates and place names are excluded.',
  ];

  return lines.join('\n');
}
