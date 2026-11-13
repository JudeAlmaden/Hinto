import { describe, expect, it } from '@jest/globals';

import { WATCHDOG, deriveTrackingStatus, describeSampleAge, shouldInterrupt } from '../watchdog';

const NOW = 1_700_000_000_000;

function status(lastSampleAt: number | null, paused = false, idle = false) {
  return deriveTrackingStatus({ lastSampleAt, now: NOW, paused, idle });
}

describe('deriveTrackingStatus (D14)', () => {
  it('is idle with no journey', () => {
    expect(status(null, false, true)).toBe('idle');
  });

  it('tracks while samples are fresh', () => {
    expect(status(NOW - 5_000)).toBe('tracking');
  });

  it('waits for a fix after 60 seconds', () => {
    expect(status(NOW - WATCHDOG.waitingMs)).toBe('waiting');
  });

  it('goes stale after 3 minutes', () => {
    expect(status(NOW - WATCHDOG.staleMs)).toBe('stale');
  });

  it('reports waiting before the first sample', () => {
    expect(status(null)).toBe('waiting');
  });

  it('reports paused ahead of freshness', () => {
    expect(status(NOW - WATCHDOG.staleMs, true)).toBe('paused');
  });
});

describe('shouldInterrupt', () => {
  it('interrupts after 10 minutes without samples', () => {
    expect(shouldInterrupt(NOW - WATCHDOG.interruptedMs, NOW)).toBe(true);
  });

  it('does not interrupt with a recent sample', () => {
    expect(shouldInterrupt(NOW - 60_000, NOW)).toBe(false);
  });

  it('does not interrupt a journey that never sampled', () => {
    expect(shouldInterrupt(null, NOW)).toBe(false);
  });
});

describe('describeSampleAge', () => {
  it('formats seconds and minutes', () => {
    expect(describeSampleAge(NOW - 4_000, NOW)).toBe('4s');
    expect(describeSampleAge(NOW - 130_000, NOW)).toBe('2m 10s');
    expect(describeSampleAge(null, NOW)).toBe('never');
  });
});
