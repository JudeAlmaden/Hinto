import * as Location from 'expo-location';

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
    const parts = [place.name, place.street, place.district, place.city].filter(
      (part): part is string => Boolean(part),
    );
    return parts.length > 0 ? parts.slice(0, 2).join(', ') : null;
  } catch {
    return null;
  }
}
