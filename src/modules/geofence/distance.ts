/**
 * Distance maths for the geofence (plan Phase 4).
 *
 * Pure functions only: no platform APIs, so they run in the background task and
 * in Jest without mocks.
 */

import type { GeoPoint } from './index';

const EARTH_RADIUS_M = 6_371_008.8;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function isValidLatitude(latitude: number): boolean {
  return Number.isFinite(latitude) && latitude >= -90 && latitude <= 90;
}

export function isValidLongitude(longitude: number): boolean {
  return Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
}

export function isValidPoint(point: GeoPoint): boolean {
  return isValidLatitude(point.latitude) && isValidLongitude(point.longitude);
}

/** Great-circle distance in metres. */
export function haversineMeters(a: GeoPoint, b: GeoPoint): number {
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const deltaLat = lat2 - lat1;
  const deltaLng = toRadians(b.longitude - a.longitude);

  const h =
    Math.sin(deltaLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Shortest distance from `point` to the segment `a`→`b`, in metres.
 *
 * Uses an equirectangular projection centred on `point`; over the few hundred
 * metres between two consecutive GPS fixes the error is far below the radius
 * being tested, and it lets the evaluator notice a stop that was passed between
 * two samples instead of inferred from a single point.
 */
export function distanceToSegmentMeters(a: GeoPoint, b: GeoPoint, point: GeoPoint): number {
  const latRad = toRadians(point.latitude);
  const projectX = (longitude: number) =>
    toRadians(longitude - point.longitude) * Math.cos(latRad) * EARTH_RADIUS_M;
  const projectY = (latitude: number) => toRadians(latitude - point.latitude) * EARTH_RADIUS_M;

  const ax = projectX(a.longitude);
  const ay = projectY(a.latitude);
  const bx = projectX(b.longitude);
  const by = projectY(b.latitude);

  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq === 0) return Math.hypot(ax, ay);

  const t = Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSq));
  return Math.hypot(ax + t * dx, ay + t * dy);
}
