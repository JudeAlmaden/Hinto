import * as Location from 'expo-location';

/** Plus codes like `WCJC+6F7` are addresses, not names. */
const PLUS_CODE = /^[A-Z0-9]{2,8}\+[A-Z0-9]{2,3}$/i;

function cleanPart(part: string | null | undefined): string {
  if (!part) return '';
  return part
    .split(',')
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0 && !PLUS_CODE.test(segment))
    .join(', ');
}

/**
 * Best-effort human label for a coordinate (plan D17). Returns null when
 * geocoding is unavailable; callers must still be able to save a place.
 */
export async function suggestPlaceName(
  latitude: number,
  longitude: number,
): Promise<string | null> {
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (!place) return null;
    const parts = [place.name, place.street, place.district, place.city]
      .map(cleanPart)
      .filter((part) => part.length > 0);
    return parts.length > 0 ? parts.slice(0, 2).join(', ') : null;
  } catch {
    return null;
  }
}
