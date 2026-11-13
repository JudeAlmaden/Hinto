/**
 * Maps — pin picker only (plan D3, D18). The journey screen never renders a map.
 */

export interface PinPoint {
  latitude: number;
  longitude: number;
}

export function formatCoordinates({ latitude, longitude }: PinPoint): string {
  return `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
}

/** Label used when reverse geocoding is unavailable (D17). */
export function offlinePinLabel(point: PinPoint): string {
  return `Dropped pin · ${formatCoordinates(point)}`;
}
