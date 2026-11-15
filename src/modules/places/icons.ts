import type { PlaceCategory } from '.';

/**
 * Icon names from the app's Ionicons set. `places.icon` stores the name, so a
 * place keeps its icon across themes and devices. Rows written by older builds
 * stored emoji; `resolvePlaceIcon` maps those once, at render time.
 */
export const PLACE_ICONS = [
  'home',
  'school',
  'briefcase',
  'bus',
  'location',
  'star',
  'cart',
  'medkit',
  'restaurant',
  'car',
  'business',
  'sunny',
] as const;

export type PlaceIconName = (typeof PLACE_ICONS)[number];

/** Outline twins, used in pickers so the set reads lighter next to the chips. */
export const PLACE_ICON_OUTLINES: Record<PlaceIconName, string> = {
  home: 'home-outline',
  school: 'school-outline',
  briefcase: 'briefcase-outline',
  bus: 'bus-outline',
  location: 'location-outline',
  star: 'star-outline',
  cart: 'cart-outline',
  medkit: 'medkit-outline',
  restaurant: 'restaurant-outline',
  car: 'car-outline',
  business: 'business-outline',
  sunny: 'sunny-outline',
};

/** Tag defaults, used until the user picks an icon of their own. */
export const CATEGORY_ICONS: Record<PlaceCategory, PlaceIconName> = {
  home: 'home',
  school: 'school',
  work: 'briefcase',
  terminal: 'bus',
  other: 'location',
};

const LEGACY_EMOJI: Record<string, PlaceIconName> = {
  '🏠': 'home',
  '🏫': 'school',
  '💼': 'briefcase',
  '🚌': 'bus',
  '📍': 'location',
  '⭐️': 'star',
  '⭐': 'star',
  '🛒': 'cart',
  '🏥': 'medkit',
  '🍜': 'restaurant',
  '⛽️': 'car',
  '⛽': 'car',
  '🏢': 'business',
  '🏖️': 'sunny',
  '🏖': 'sunny',
};

export function defaultIconFor(category: PlaceCategory): PlaceIconName {
  return CATEGORY_ICONS[category];
}

/** Accepts a stored icon name, a legacy emoji, or nothing. */
export function resolvePlaceIcon(
  icon: string | null | undefined,
  category: PlaceCategory,
): PlaceIconName {
  if (!icon) return defaultIconFor(category);
  if (icon in LEGACY_EMOJI) return LEGACY_EMOJI[icon];
  return PLACE_ICONS.includes(icon as PlaceIconName)
    ? (icon as PlaceIconName)
    : defaultIconFor(category);
}
