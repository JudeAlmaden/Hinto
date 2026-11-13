import { describe, expect, it } from '@jest/globals';

import {
  BATTERY_HEURISTIC,
  findGapEvents,
  gapThresholdMs,
  isRestrictionSuspected,
} from '../heuristics';

const EXPECTED = 30_000; // 30 s policy
const START = 1_700_000_000_000;

function active(overrides: Partial<Parameters<typeof isRestrictionSuspected>[0]> = {}) {
  return isRestrictionSuspected({
    timestamps: [],
    expectedIntervalMs: EXPECTED,
    now: START,
    journeyActive: true,
    locationPermissionGranted: true,
    ...overrides,
  });
}

describe('gap threshold', () => {
  it('is the larger of three policy intervals and five minutes', () => {
    expect(gapThresholdMs(30_000)).toBe(BATTERY_HEURISTIC.minGapMs);
    expect(gapThresholdMs(120_000)).toBe(360_000);
  });
});

describe('findGapEvents', () => {
  it('finds intervals beyond the threshold', () => {
    const timestamps = [START, START + 30_000, START + 400_000, START + 430_000];
    expect(findGapEvents(timestamps, EXPECTED)).toEqual([START + 400_000]);
  });

  it('ignores regular cadence', () => {
    const timestamps = Array.from({ length: 10 }, (_, index) => START + index * 30_000);
    expect(findGapEvents(timestamps, EXPECTED)).toEqual([]);
  });
});

describe('isRestrictionSuspected', () => {
  const twoGaps = [START, START + 30_000, START + 400_000, START + 430_000, START + 800_000];

  it('suspects a restriction after two gaps inside the window', () => {
    expect(active({ timestamps: twoGaps, now: START + 800_000 })).toBe(true);
  });

  it('needs two gaps, not one', () => {
    expect(
      active({ timestamps: [START, START + 30_000, START + 400_000], now: START + 800_000 }),
    ).toBe(false);
  });

  it('ignores gaps older than the rolling window', () => {
    expect(active({ timestamps: twoGaps, now: START + BATTERY_HEURISTIC.windowMs + 800_000 })).toBe(
      false,
    );
  });

  it('never blames the OEM when permission is missing', () => {
    expect(
      active({ timestamps: twoGaps, now: START + 800_000, locationPermissionGranted: false }),
    ).toBe(false);
  });

  it('stays quiet when no journey is running', () => {
    expect(active({ timestamps: twoGaps, now: START + 800_000, journeyActive: false })).toBe(false);
  });
});
