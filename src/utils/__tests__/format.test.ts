import { describe, expect, it } from '@jest/globals';

import { dayBucket, formatDistance, formatDuration, formatPercent } from '../format';

describe('formatDistance', () => {
  it('shows metres below one kilometre', () => {
    expect(formatDistance(450, 'km')).toBe('450 m');
    expect(formatDistance(996, 'km')).toBe('1.0 km');
  });

  it('shows one decimal for single-digit kilometres', () => {
    expect(formatDistance(1000, 'km')).toBe('1.0 km');
    expect(formatDistance(2540, 'km')).toBe('2.5 km');
  });

  it('rounds longer distances', () => {
    expect(formatDistance(12_400, 'km')).toBe('12 km');
  });

  it('converts to miles when requested', () => {
    expect(formatDistance(1609.344, 'mi')).toBe('1.0 mi');
  });

  it('returns a placeholder for unknown distances', () => {
    expect(formatDistance(null, 'km')).toBe('Unknown');
  });
});

describe('formatDuration', () => {
  it('formats minutes and hours', () => {
    expect(formatDuration(24 * 60_000)).toBe('24 min');
    expect(formatDuration(90 * 60_000)).toBe('1h 30m');
    expect(formatDuration(45_000)).toBe('under a minute');
  });

  it('returns n/a when unknown', () => {
    expect(formatDuration(null)).toBe('n/a');
  });
});

describe('formatPercent', () => {
  it('rounds and marks percentages', () => {
    expect(formatPercent(67.4)).toBe('67%');
    expect(formatPercent(null)).toBe('n/a');
  });
});

describe('dayBucket', () => {
  const now = new Date(2026, 10, 13, 12, 0, 0).getTime();

  it('groups today, yesterday and earlier', () => {
    expect(dayBucket(new Date(2026, 10, 13, 8, 0, 0).getTime(), now)).toBe('today');
    expect(dayBucket(new Date(2026, 10, 12, 23, 0, 0).getTime(), now)).toBe('yesterday');
    expect(dayBucket(new Date(2026, 10, 10, 9, 0, 0).getTime(), now)).toBe('earlier');
  });
});
