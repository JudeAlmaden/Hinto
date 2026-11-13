/**
 * Online place search (plan D15).
 *
 * Photon (OpenStreetMap) behind one module so the provider can be swapped
 * without touching a screen. Every failure degrades to "search unavailable";
 * nothing here is ever required to start a journey (D17).
 */

import type { PlaceSearchResult } from './index';

export const SEARCH = {
  debounceMs: 350,
  minCharacters: 3,
  minRequestIntervalMs: 1000,
  maxResults: 10,
  cacheTtlMs: 24 * 60 * 60 * 1000,
  timeoutMs: 3000,
  endpoint: 'https://photon.komoot.io/api/',
} as const;

export class SearchUnavailableError extends Error {
  constructor(readonly reason: 'network' | 'timeout' | 'rate-limited' | 'bad-response') {
    super(`Place search is unavailable (${reason}).`);
    this.name = 'SearchUnavailableError';
  }
}

interface CacheEntry {
  results: PlaceSearchResult[];
  storedAt: number;
}

const cache = new Map<string, CacheEntry>();
let lastRequestAt = 0;

function cacheKey(query: string): string {
  return query.trim().toLowerCase();
}

function readCache(query: string, now: number): PlaceSearchResult[] | null {
  const entry = cache.get(cacheKey(query));
  if (!entry) return null;
  if (now - entry.storedAt > SEARCH.cacheTtlMs) {
    cache.delete(cacheKey(query));
    return null;
  }
  return entry.results;
}

function writeCache(query: string, results: PlaceSearchResult[], now: number): void {
  cache.set(cacheKey(query), { results, storedAt: now });
}

interface PhotonFeature {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    district?: string;
    city?: string;
    county?: string;
    state?: string;
    country?: string;
    osm_value?: string;
  };
}

function describe(feature: PhotonFeature): { name: string; subtitle: string | null } {
  const properties = feature.properties ?? {};
  const name =
    properties.name ??
    [properties.street, properties.housenumber].filter(Boolean).join(' ') ??
    '';

  const parts = [properties.district, properties.city, properties.state, properties.country]
    .filter((part): part is string => Boolean(part));
  const subtitle = parts.length > 0 ? parts.join(', ') : (properties.osm_value ?? null);

  return { name: name || subtitle || 'Unnamed place', subtitle: name ? subtitle : null };
}

export function parsePhotonResponse(payload: unknown): PlaceSearchResult[] {
  if (!payload || typeof payload !== 'object' || !Array.isArray((payload as { features?: unknown }).features)) {
    throw new SearchUnavailableError('bad-response');
  }

  const features = (payload as { features: PhotonFeature[] }).features;
  const results: PlaceSearchResult[] = [];

  for (const feature of features) {
    const coordinates = feature.geometry?.coordinates;
    if (!coordinates || coordinates.length !== 2) continue;
    const [longitude, latitude] = coordinates;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) continue;

    const { name, subtitle } = describe(feature);
    results.push({ name, subtitle, latitude, longitude, placeId: null });
    if (results.length >= SEARCH.maxResults) break;
  }

  return results;
}

/** Rate-limited, cached, cancellable search. Never throws anything but SearchUnavailableError. */
export async function searchPlacesOnline(
  query: string,
  options: { signal?: AbortSignal; now?: number } = {},
): Promise<PlaceSearchResult[]> {
  const trimmed = query.trim();
  if (trimmed.length < SEARCH.minCharacters) return [];

  const now = options.now ?? Date.now();
  const cached = readCache(trimmed, now);
  if (cached) return cached;

  const wait = SEARCH.minRequestIntervalMs - (now - lastRequestAt);
  if (wait > 0) {
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestAt = Date.now();

  const url = `${SEARCH.endpoint}?q=${encodeURIComponent(trimmed)}&limit=${SEARCH.maxResults}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), SEARCH.timeoutMs);
  const abortListener = () => controller.abort();
  options.signal?.addEventListener('abort', abortListener);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });

    if (response.status === 429) throw new SearchUnavailableError('rate-limited');
    if (!response.ok) throw new SearchUnavailableError('bad-response');

    const results = parsePhotonResponse(await response.json());
    writeCache(trimmed, results, Date.now());
    return results;
  } catch (error) {
    if (error instanceof SearchUnavailableError) throw error;
    if (options.signal?.aborted) return [];
    if (controller.signal.aborted) throw new SearchUnavailableError('timeout');
    throw new SearchUnavailableError('network');
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortListener);
  }
}

/** Clears the in-memory cache (diagnostics and tests only). */
export function clearSearchCache(): void {
  cache.clear();
  lastRequestAt = 0;
}
