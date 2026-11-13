import { describe, expect, it } from '@jest/globals';

import { distanceToSegmentMeters, haversineMeters, isValidPoint } from '../distance';

const MANILA = { latitude: 14.5995, longitude: 120.9842 };
const M_PER_DEG_LAT = 111_320;

function northBy(metres: number) {
  return { latitude: MANILA.latitude + metres / M_PER_DEG_LAT, longitude: MANILA.longitude };
}

describe('haversineMeters', () => {
  it('is zero for the same point', () => {
    expect(haversineMeters(MANILA, MANILA)).toBe(0);
  });

  it('measures one degree of latitude as ~111.2 km', () => {
    const distance = haversineMeters(MANILA, northBy(M_PER_DEG_LAT));
    expect(distance).toBeGreaterThan(111_000);
    expect(distance).toBeLessThan(111_500);
  });

  it('is symmetric', () => {
    const a = northBy(750);
    expect(haversineMeters(MANILA, a)).toBeCloseTo(haversineMeters(a, MANILA), 6);
  });

  it('handles an offset of a few hundred metres precisely enough for a radius test', () => {
    expect(haversineMeters(MANILA, northBy(400))).toBeGreaterThan(395);
    expect(haversineMeters(MANILA, northBy(400))).toBeLessThan(405);
  });
});

describe('distanceToSegmentMeters', () => {
  it('returns the perpendicular distance when the point falls beside the segment', () => {
    const start = northBy(1000);
    const end = northBy(-1000);
    expect(distanceToSegmentMeters(start, end, MANILA)).toBeLessThan(1);
  });

  it('detects a segment that passes near the destination', () => {
    const start = northBy(1200);
    const end = northBy(-1200);
    expect(distanceToSegmentMeters(start, end, MANILA)).toBeLessThan(1000);
  });

  it('measures to the nearest endpoint when the destination is past the segment', () => {
    const start = northBy(2000);
    const end = northBy(1500);
    expect(distanceToSegmentMeters(start, end, MANILA)).toBeGreaterThan(1400);
    expect(distanceToSegmentMeters(start, end, MANILA)).toBeLessThan(1600);
  });

  it('degrades to point distance when both endpoints are identical', () => {
    const point = northBy(250);
    expect(distanceToSegmentMeters(point, point, MANILA)).toBeCloseTo(250, 0);
  });
});

describe('isValidPoint', () => {
  it('accepts real coordinates', () => {
    expect(isValidPoint(MANILA)).toBe(true);
  });

  it('rejects out-of-range or non-finite coordinates', () => {
    expect(isValidPoint({ latitude: 91, longitude: 0 })).toBe(false);
    expect(isValidPoint({ latitude: 0, longitude: 181 })).toBe(false);
    expect(isValidPoint({ latitude: Number.NaN, longitude: 0 })).toBe(false);
  });
});
