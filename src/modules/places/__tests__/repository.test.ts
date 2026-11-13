import { describe, expect, it } from '@jest/globals';

import { assertValidPlace, mapPlaceRow } from '../repository';

const baseRow = {
  id: 'place-1',
  name: 'Home',
  category: 'home',
  latitude: 14.5995,
  longitude: 120.9842,
  icon: null,
  color: '#208AEF',
  default_radius_m: 500,
  is_favorite: 1,
  created_at: 1_700_000_000_000,
  updated_at: 1_700_000_001_000,
};

const validInput = {
  name: 'Home',
  category: 'home',
  latitude: 14.5995,
  longitude: 120.9842,
  defaultRadiusM: 500,
};

describe('mapPlaceRow', () => {
  it('maps snake_case columns onto the domain object', () => {
    expect(mapPlaceRow(baseRow)).toEqual({
      id: 'place-1',
      name: 'Home',
      category: 'home',
      latitude: 14.5995,
      longitude: 120.9842,
      icon: null,
      color: '#208AEF',
      defaultRadiusM: 500,
      isFavorite: true,
      createdAt: 1_700_000_000_000,
      updatedAt: 1_700_000_001_000,
    });
  });

  it('treats only 1 as a favourite', () => {
    expect(mapPlaceRow({ ...baseRow, is_favorite: 0 }).isFavorite).toBe(false);
  });
});

describe('assertValidPlace', () => {
  it('accepts a well-formed place, including the radius bounds', () => {
    expect(() => assertValidPlace(validInput)).not.toThrow();
    expect(() => assertValidPlace({ ...validInput, defaultRadiusM: 100 })).not.toThrow();
    expect(() => assertValidPlace({ ...validInput, defaultRadiusM: 20_000 })).not.toThrow();
  });

  it('rejects a nameless place', () => {
    expect(() => assertValidPlace({ ...validInput, name: '   ' })).toThrow(/name/);
  });

  it('rejects coordinates outside their ranges', () => {
    expect(() => assertValidPlace({ ...validInput, latitude: 91 })).toThrow(/Latitude/);
    expect(() => assertValidPlace({ ...validInput, longitude: -181 })).toThrow(/Longitude/);
    expect(() => assertValidPlace({ ...validInput, latitude: Number.NaN })).toThrow(/Latitude/);
  });

  it('rejects radii outside the shared bounds', () => {
    expect(() => assertValidPlace({ ...validInput, defaultRadiusM: 50 })).toThrow(/100 m/);
    expect(() => assertValidPlace({ ...validInput, defaultRadiusM: 25_000 })).toThrow(/20 km|20000/);
  });

  it('rejects an unknown category', () => {
    expect(() => assertValidPlace({ ...validInput, category: 'airport' })).toThrow(/category/);
  });
});
