import { afterEach, describe, expect, it, jest } from '@jest/globals';

import {
  SearchUnavailableError,
  clearSearchCache,
  parsePhotonResponse,
  searchPlacesOnline,
} from '../search';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  clearSearchCache();
});

const payload = {
  features: [
    {
      geometry: { coordinates: [121.0244, 14.5547] },
      properties: { name: 'Cubao MRT-3 Station', city: 'Quezon City', state: 'Metro Manila' },
    },
    {
      geometry: { coordinates: [121.03, 14.56] },
      properties: { street: 'Aurora Blvd', housenumber: '12', district: 'Cubao' },
    },
    {
      geometry: { coordinates: [] },
      properties: { name: 'Broken result' },
    },
    {
      geometry: { coordinates: [121.04, 14.57] },
      properties: {},
    },
  ],
};

describe('parsePhotonResponse', () => {
  it('maps features to destinations with name, subtitle and coordinates', () => {
    const results = parsePhotonResponse(payload);
    expect(results).toHaveLength(3);
    expect(results[0]).toEqual({
      name: 'Cubao MRT-3 Station',
      subtitle: 'Quezon City, Metro Manila',
      latitude: 14.5547,
      longitude: 121.0244,
      placeId: null,
    });
  });

  it('builds a street name when the feature has no name', () => {
    const results = parsePhotonResponse(payload);
    expect(results[1].name).toBe('Aurora Blvd 12');
  });

  it('falls back to a label when nothing else exists', () => {
    const results = parsePhotonResponse(payload);
    expect(results[2].name).toBe('Unnamed place');
  });

  it('rejects an unexpected payload', () => {
    expect(() => parsePhotonResponse({})).toThrow(SearchUnavailableError);
  });

  it('caps the number of results', () => {
    const many = {
      features: Array.from({ length: 30 }, (_, index) => ({
        geometry: { coordinates: [121 + index / 100, 14 + index / 100] },
        properties: { name: `Place ${index}` },
      })),
    };
    expect(parsePhotonResponse(many)).toHaveLength(10);
  });
});

describe('searchPlacesOnline', () => {
  it('ignores queries shorter than the minimum', async () => {
    const fetchMock = jest.fn();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    await expect(searchPlacesOnline('ab')).resolves.toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns mapped results for a successful request', async () => {
    const fetchMock = jest.fn(async () => new Response(JSON.stringify(payload), { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const results = await searchPlacesOnline('cubao', { now: Date.now() + 60_000 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(results[0]?.name).toBe('Cubao MRT-3 Station');
  });

  it('caches repeated queries', async () => {
    const fetchMock = jest.fn(async () => new Response(JSON.stringify(payload), { status: 200 }));
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await searchPlacesOnline('cubao', { now: Date.now() + 60_000 });
    await searchPlacesOnline('cubao', { now: Date.now() + 120_000 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('turns a server error into "search unavailable"', async () => {
    globalThis.fetch = (async () => new Response('', { status: 500 })) as unknown as typeof fetch;
    await expect(
      searchPlacesOnline('cubao', { now: Date.now() + 180_000 }),
    ).rejects.toBeInstanceOf(SearchUnavailableError);
  });

  it('turns a network failure into "search unavailable"', async () => {
    globalThis.fetch = (async () => {
      throw new TypeError('Network request failed');
    }) as unknown as typeof fetch;

    await expect(
      searchPlacesOnline('manila', { now: Date.now() + 240_000 }),
    ).rejects.toBeInstanceOf(SearchUnavailableError);
  });
});
