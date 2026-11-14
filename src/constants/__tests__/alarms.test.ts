import { describe, expect, it } from '@jest/globals';

import {
  ACCURACY_TRUST_M,
  DEFAULT_RADIUS_M,
  FRESHNESS,
  MAX_RADIUS_M,
  MIN_RADIUS_M,
  RADIUS_PRESETS_M,
  isConfidentlyInside,
  isRadiusValid,
  isSampleTrustworthy,
} from '../alarms';

describe('radius presets and bounds', () => {
  it('lists presets widest first', () => {
    const sorted = [...RADIUS_PRESETS_M].sort((a, b) => b - a);
    expect([...RADIUS_PRESETS_M]).toEqual(sorted);
  });

  it('keeps every preset inside the validation bounds', () => {
    for (const preset of RADIUS_PRESETS_M) {
      expect(isRadiusValid(preset)).toBe(true);
    }
    expect(isRadiusValid(DEFAULT_RADIUS_M)).toBe(true);
  });

  it('rejects radii outside the bounds', () => {
    expect(isRadiusValid(MIN_RADIUS_M - 1)).toBe(false);
    expect(isRadiusValid(MAX_RADIUS_M + 1)).toBe(false);
    expect(isRadiusValid(Number.NaN)).toBe(false);
    expect(isRadiusValid(Number.POSITIVE_INFINITY)).toBe(false);
  });

  it('accepts the inclusive bounds', () => {
    expect(isRadiusValid(MIN_RADIUS_M)).toBe(true);
    expect(isRadiusValid(MAX_RADIUS_M)).toBe(true);
  });
});

describe('accuracy gate (D14)', () => {
  const radius = 1000;

  it('fires when the error bound is comfortably inside the radius', () => {
    expect(isConfidentlyInside(400, 20, radius)).toBe(true);
  });

  it('accepts an imprecise fix while the worst case is still inside', () => {
    // A 100 m Android fix 120 m from a 5 km stop is certainly inside it.
    expect(isConfidentlyInside(400, ACCURACY_TRUST_M + 1, radius)).toBe(true);
    expect(isConfidentlyInside(120, 100, 5000)).toBe(true);
  });

  it('refuses once the error bound reaches the radius', () => {
    expect(isConfidentlyInside(400, 650, radius)).toBe(false);
  });

  it('refuses when accuracy pushes the bound outside the radius', () => {
    expect(isConfidentlyInside(980, 40, radius)).toBe(false);
  });

  it('treats the exact boundary as inside', () => {
    expect(isConfidentlyInside(960, 40, radius)).toBe(true);
  });
});

describe('freshness (D14)', () => {
  const now = 1_000_000;

  it('trusts a sample inside the floor window', () => {
    expect(isSampleTrustworthy(now - FRESHNESS.minTrustMs, now, 5_000)).toBe(true);
  });

  it('distrusts a sample older than the floor window', () => {
    expect(isSampleTrustworthy(now - FRESHNESS.minTrustMs - 1, now, 5_000)).toBe(false);
  });

  it('widens the window for slow policies', () => {
    const slowInterval = 60_000;
    expect(
      isSampleTrustworthy(now - (FRESHNESS.trustFactor * slowInterval), now, slowInterval),
    ).toBe(true);
  });
});
