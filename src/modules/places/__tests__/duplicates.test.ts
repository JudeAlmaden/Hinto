import { describe, expect, it } from '@jest/globals';

import type { Place } from '..';
import { findNearbyDuplicate } from '../duplicates';

function place(overrides: Partial<Place> = {}): Place {
  return {
    id: 'place-1',
    name: 'Work',
    category: 'work',
    latitude: 14.5,
    longitude: 121,
    icon: null,
    color: null,
    defaultRadiusM: 1000,
    isFavorite: false,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('findNearbyDuplicate', () => {
  it('matches the same name within 50 m', () => {
    const existing = place();
    const found = findNearbyDuplicate([existing], {
      name: '  work ',
      latitude: 14.50027,
      longitude: 121,
    });
    expect(found).toBe(existing);
  });

  it('ignores the same name far away', () => {
    expect(
      findNearbyDuplicate([place()], { name: 'Work', latitude: 14.51, longitude: 121 }),
    ).toBeNull();
  });

  it('ignores a different name at the same spot', () => {
    expect(
      findNearbyDuplicate([place()], { name: 'Office', latitude: 14.5, longitude: 121 }),
    ).toBeNull();
  });

  it('skips the place being edited', () => {
    expect(
      findNearbyDuplicate([place()], { name: 'Work', latitude: 14.5, longitude: 121 }, 'place-1'),
    ).toBeNull();
  });

  it('needs a name to compare', () => {
    expect(
      findNearbyDuplicate([place()], { name: '   ', latitude: 14.5, longitude: 121 }),
    ).toBeNull();
  });
});
