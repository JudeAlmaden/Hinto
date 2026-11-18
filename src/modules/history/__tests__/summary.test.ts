import { describe, expect, it } from '@jest/globals';

import type { Journey, JourneyAlert } from '@/modules/journeys';

import { countAlerts, groupSummaries, summariseJourney } from '../summary';

const NOW = new Date(2026, 10, 13, 15, 0, 0).getTime();

function journey(overrides: Partial<Journey> = {}): Journey {
  return {
    id: 'journey-1',
    placeId: null,
    destinationName: 'Home',
    destinationLatitude: 14.5995,
    destinationLongitude: 120.9842,
    radiusM: 1000,
    status: 'completed',
    startedAt: NOW - 24 * 60_000,
    triggeredAt: NOW - 10 * 60_000,
    endedAt: NOW,
    lastLocationAt: NOW - 1000,
    lastKnownDistanceM: 300,
    startDistanceM: 4200,
    alarmDismissedAt: null,
    enteredRadiusAt: NOW - 11 * 60_000,
    startBatteryPct: 80,
    endBatteryPct: 78,
    createdAt: NOW - 30 * 60_000,
    ...overrides,
  };
}

function alert(overrides: Partial<JourneyAlert> = {}): JourneyAlert {
  return {
    id: 'alert-1',
    journeyId: 'journey-1',
    alertType: 'primary',
    stageIndex: 0,
    triggerDistanceM: 900,
    accuracyM: 15,
    triggeredAt: NOW - 10 * 60_000,
    dismissedAt: null,
    snoozedUntil: null,
    ...overrides,
  };
}

describe('summariseJourney', () => {
  it('projects the duration and the first alert', () => {
    const summary = summariseJourney(journey(), [alert()]);
    expect(summary.durationMs).toBe(24 * 60_000);
    expect(summary.alertType).toBe('primary');
    expect(summary.triggerDistanceM).toBe(900);
    expect(summary.finalDistanceM).toBe(300);
  });

  it('has no alert type for a journey that never rang', () => {
    const summary = summariseJourney(journey({ triggeredAt: null }), []);
    expect(summary.alertType).toBeNull();
    expect(summary.triggerDistanceM).toBeNull();
  });

  it('leaves duration unknown while the journey is unfinished', () => {
    const summary = summariseJourney(journey({ endedAt: null }), []);
    expect(summary.durationMs).toBeNull();
  });
});

describe('groupSummaries', () => {
  it('groups today, yesterday and earlier, dropping empty groups', () => {
    const today = summariseJourney(journey({ id: 'a' }), []);
    const yesterday = summariseJourney(
      journey({ id: 'b', startedAt: new Date(2026, 10, 12, 20, 0, 0).getTime() }),
      [],
    );
    const earlier = summariseJourney(
      journey({ id: 'c', startedAt: new Date(2026, 10, 9, 20, 0, 0).getTime() }),
      [],
    );

    const groups = groupSummaries([today, yesterday, earlier], NOW);
    expect(groups.map((group) => group.bucket)).toEqual(['today', 'yesterday', 'earlier']);
    expect(groups.map((group) => group.items.length)).toEqual([1, 1, 1]);
  });

  it('omits a group with no journeys', () => {
    const groups = groupSummaries([summariseJourney(journey(), [])], NOW);
    expect(groups).toHaveLength(1);
    expect(groups[0].bucket).toBe('today');
  });
});

describe('countAlerts', () => {
  it('counts journeys that rang', () => {
    const summaries = [
      summariseJourney(journey({ id: 'a' }), [alert({ journeyId: 'a' })]),
      summariseJourney(journey({ id: 'b' }), []),
    ];
    expect(countAlerts(summaries)).toBe(1);
  });
});
