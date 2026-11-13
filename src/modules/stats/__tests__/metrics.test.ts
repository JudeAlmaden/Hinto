import { describe, expect, it } from '@jest/globals';

import type { Journey, JourneyAlert } from '@/modules/journeys';

import { computeMetrics } from '../metrics';

const NOW = Date.UTC(2026, 10, 13, 12, 0, 0);
const HOUR = 3_600_000;
const DAY = 86_400_000;

function journey(overrides: Partial<Journey> = {}): Journey {
  return {
    id: overrides.id ?? 'journey-1',
    placeId: null,
    destinationName: 'Home',
    destinationLatitude: 14.5995,
    destinationLongitude: 120.9842,
    radiusM: 1000,
    status: 'completed',
    startedAt: NOW - HOUR,
    triggeredAt: null,
    endedAt: NOW,
    lastLocationAt: NOW - 1000,
    lastKnownDistanceM: 800,
    alarmDismissedAt: null,
    enteredRadiusAt: null,
    startBatteryPct: 80,
    endBatteryPct: 76,
    createdAt: NOW - 2 * HOUR,
    ...overrides,
  };
}

function alert(overrides: Partial<JourneyAlert> = {}): JourneyAlert {
  return {
    id: overrides.id ?? 'alert-1',
    journeyId: 'journey-1',
    alertType: 'primary',
    stageIndex: 0,
    triggerDistanceM: 900,
    accuracyM: 15,
    triggeredAt: NOW - 60_000,
    dismissedAt: null,
    snoozedUntil: null,
    ...overrides,
  };
}

describe('computeMetrics', () => {
  it('reports the journey start completion rate', () => {
    const metrics = computeMetrics(
      [
        journey({ id: 'a', startedAt: NOW - HOUR }),
        journey({ id: 'b', startedAt: null, status: 'cancelled' }),
      ],
      [],
      NOW,
    );
    expect(metrics.journeyStartRate).toBe(0.5);
  });

  it('reports the alert success rate over finished journeys', () => {
    const metrics = computeMetrics(
      [
        journey({ id: 'a', triggeredAt: NOW - 60_000 }),
        journey({ id: 'b' }),
        journey({ id: 'c' }),
      ],
      [alert({ journeyId: 'a' })],
      NOW,
    );
    expect(metrics.alertSuccessRate).toBeCloseTo(1 / 3, 5);
  });

  it('uses the median delay between entering the radius and the alert', () => {
    const metrics = computeMetrics(
      [
        journey({ id: 'a', enteredRadiusAt: NOW - 120_000 }),
        journey({ id: 'b', enteredRadiusAt: NOW - 300_000 }),
      ],
      [
        alert({ journeyId: 'a', triggeredAt: NOW - 90_000 }),
        alert({ id: 'alert-2', journeyId: 'b', triggeredAt: NOW - 240_000 }),
      ],
      NOW,
    );
    expect(metrics.medianAlertDelayMs).toBe(45_000);
  });

  it('counts a missed alert when the journey ended inside the radius without one', () => {
    const metrics = computeMetrics(
      [
        journey({ id: 'a', lastKnownDistanceM: 400 }),
        journey({ id: 'b', lastKnownDistanceM: 400 }),
      ],
      [alert({ journeyId: 'b' })],
      NOW,
    );
    expect(metrics.missedAlerts).toBe(1);
  });

  it('counts duplicate alerts per journey', () => {
    const metrics = computeMetrics(
      [journey({ id: 'a' })],
      [
        alert({ journeyId: 'a' }),
        alert({ id: 'alert-2', journeyId: 'a', alertType: 'earlier' }),
        alert({ id: 'alert-3', journeyId: 'a', alertType: 'snooze' }),
      ],
      NOW,
    );
    expect(metrics.duplicateAlerts).toBe(1);
  });

  it('derives battery per hour only from long enough journeys', () => {
    const metrics = computeMetrics(
      [
        journey({ id: 'a', startBatteryPct: 80, endBatteryPct: 72, startedAt: NOW - 2 * HOUR }),
        journey({ id: 'b', startBatteryPct: 90, endBatteryPct: 89, startedAt: NOW - 10 * 60_000 }),
      ],
      [],
      NOW,
    );
    expect(metrics.batteryPerHourPct).toBe(4);
  });

  it('reports saved-place reuse', () => {
    const metrics = computeMetrics(
      [journey({ id: 'a', placeId: 'place-1' }), journey({ id: 'b', placeId: null })],
      [],
      NOW,
    );
    expect(metrics.savedPlaceReuseRate).toBe(0.5);
  });

  it('ignores journeys outside the window', () => {
    const metrics = computeMetrics(
      [journey({ createdAt: NOW - 40 * DAY, startedAt: NOW - 40 * DAY, endedAt: NOW - 40 * DAY })],
      [],
      NOW,
    );
    expect(metrics.journeyStartRate).toBeNull();
    expect(metrics.savedPlaceReuseRate).toBeNull();
    expect(metrics.missedAlerts).toBeNull();
  });
});
