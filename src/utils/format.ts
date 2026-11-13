/**
 * Display formatting. Distances are stored canonically in metres (D5); the
 * `distance_unit` setting changes presentation only.
 */

import { formatCopy, strings } from '@/constants/strings';
import type { DistanceUnit } from '@/modules/settings/schema';

const METRES_PER_MILE = 1609.344;

export function formatDistance(metres: number | null | undefined, unit: DistanceUnit): string {
  if (metres === null || metres === undefined || !Number.isFinite(metres)) {
    return strings.common.unknown;
  }

  if (unit === 'mi') {
    const miles = metres / METRES_PER_MILE;
    return strings.common.miles
      .replace('{value}', miles < 10 ? miles.toFixed(1) : Math.round(miles).toString())
      .trim();
  }

  // Sub-kilometre values round to 10 m, but never round up into a misleading
  // "1000 m" — anything at 995 m and above becomes kilometres.
  if (metres < 995) {
    return strings.common.metres
      .replace('{value}', String(Math.round(metres / 10) * 10))
      .trim();
  }

  const kilometres = metres / 1000;
  return strings.common.kilometres
    .replace('{value}', kilometres < 10 ? kilometres.toFixed(1) : Math.round(kilometres).toString())
    .trim();
}

/** Compact radius label used on chips and summaries: `1 km`, `500 m`. */
export function formatRadius(metres: number, unit: DistanceUnit = 'km'): string {
  return formatDistance(metres, unit);
}

export function formatDuration(durationMs: number | null | undefined): string {
  if (!durationMs || durationMs < 0) return strings.common.notAvailable;
  if (durationMs < 60_000) return strings.common.underMinute;
  const totalMinutes = Math.round(durationMs / 60_000);
  if (totalMinutes < 60) {
    return formatCopy(strings.common.minutesShort, { value: totalMinutes });
  }
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return formatCopy(strings.common.hoursShort, { value: hours });
  return formatCopy(strings.common.hoursMinutes, { hours, minutes });
}

function pad(value: number): string {
  return value.toString().padStart(2, '0');
}

export function formatClock(timestamp: number): string {
  const date = new Date(timestamp);
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${date.getDate()}/${date.getMonth() + 1}/${date.getFullYear()} ${pad(date.getHours())}:${pad(
    date.getMinutes(),
  )}`;
}

/** Relative day label used by History. */
export function dayBucket(timestamp: number, now = Date.now()): 'today' | 'yesterday' | 'earlier' {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  const startOfYesterday = startOfToday.getTime() - 86_400_000;

  if (timestamp >= startOfToday.getTime()) return 'today';
  if (timestamp >= startOfYesterday) return 'yesterday';
  return 'earlier';
}

export function formatAge(timestamp: number | null, now = Date.now()): string {
  if (timestamp === null) return strings.common.unknown;
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 10) return strings.common.now;
  if (seconds < 60) return strings.common.secondsAgo.replace('{value}', String(seconds));
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return strings.common.minutesAgo.replace('{value}', String(minutes));
  return strings.common.hoursAgo.replace('{value}', String(Math.floor(minutes / 60)));
}

export function formatCoordinates(latitude: number, longitude: number): string {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return strings.common.notAvailable;
  return `${Math.round(value)}%`;
}
