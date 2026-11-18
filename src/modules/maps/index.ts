/**
 * Maps — pin picker only (plan D3, D18, D19). The journey screen never renders
 * a map; MapLibre draws free OpenStreetMap raster tiles, so no key is needed.
 */

export const PIN_MAP_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
export const PIN_MAP_ATTRIBUTION = '© OpenStreetMap contributors';

export interface PinPoint {
  latitude: number;
  longitude: number;
}

export function formatCoordinates({ latitude, longitude }: PinPoint): string {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

/** Label used when reverse geocoding is unavailable (D17). */
export function offlinePinLabel(point: PinPoint): string {
  return `Dropped pin (${formatCoordinates(point)})`;
}
