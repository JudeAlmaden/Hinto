import { describe, expect, it } from '@jest/globals';

import {
  POLICY_TABLE,
  POLICY_TUNING,
  describePolicy,
  selectPolicy,
} from '../policy';

const baseline = {
  distanceM: 20_000,
  batteryLevelPct: 80,
  batterySaver: false,
  stationaryMs: 0,
};

describe('selectPolicy', () => {
  it('samples faster the closer the destination is', () => {
    const far = selectPolicy({ ...baseline, distanceM: 20_000 });
    const mid = selectPolicy({ ...baseline, distanceM: 4_000 });
    const near = selectPolicy({ ...baseline, distanceM: 1_200 });
    const close = selectPolicy({ ...baseline, distanceM: 400 });

    expect(far.timeIntervalMs).toBeGreaterThan(mid.timeIntervalMs);
    expect(mid.timeIntervalMs).toBeGreaterThan(near.timeIntervalMs);
    expect(near.timeIntervalMs).toBeGreaterThan(close.timeIntervalMs);
    expect(close.accuracy).toBe('highest');
  });

  it('uses the furthest tier before the first fix', () => {
    const policy = selectPolicy({ ...baseline, distanceM: null });
    expect(policy.timeIntervalMs).toBe(POLICY_TABLE[POLICY_TABLE.length - 1].timeIntervalMs);
  });

  it('doubles the cadence in battery-saving mode', () => {
    const normal = selectPolicy({ ...baseline, distanceM: 1_200 });
    const saver = selectPolicy({ ...baseline, distanceM: 1_200, batterySaver: true });
    expect(saver.timeIntervalMs).toBe(normal.timeIntervalMs * POLICY_TUNING.batterySaverFactor);
    expect(saver.distanceIntervalM).toBeGreaterThan(normal.distanceIntervalM);
  });

  it('coarsens the cadence on low battery', () => {
    const normal = selectPolicy({ ...baseline, distanceM: 1_200 });
    const low = selectPolicy({ ...baseline, distanceM: 1_200, batteryLevelPct: 10 });
    expect(low.timeIntervalMs).toBe(normal.timeIntervalMs * POLICY_TUNING.lowBatteryFactor);
  });

  it('slows down when the device is stationary', () => {
    const moving = selectPolicy({ ...baseline, distanceM: 3_000 });
    const still = selectPolicy({ ...baseline, distanceM: 3_000, stationaryMs: 300_000 });
    expect(still.timeIntervalMs).toBe(moving.timeIntervalMs * POLICY_TUNING.stationaryFactor);
  });

  it('never samples slower than the cap', () => {
    const policy = selectPolicy({
      distanceM: 30_000,
      batteryLevelPct: 5,
      batterySaver: true,
      stationaryMs: 500_000,
    });
    expect(policy.timeIntervalMs).toBeLessThanOrEqual(POLICY_TUNING.maxIntervalMs);
  });

  it('keeps the accuracy at least balanced', () => {
    const policy = selectPolicy({
      distanceM: 20_000,
      batteryLevelPct: 5,
      batterySaver: true,
      stationaryMs: 500_000,
    });
    expect(policy.accuracy).toBe('balanced');
  });
});

describe('describePolicy', () => {
  it('reports the interval in seconds and the distance filter', () => {
    const text = describePolicy({
      accuracy: 'high',
      timeIntervalMs: 15_000,
      distanceIntervalM: 100,
    });
    expect(text).toContain('15 s');
    expect(text).toContain('100 m');
  });
});
