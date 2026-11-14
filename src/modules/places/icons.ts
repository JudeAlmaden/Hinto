import type { PlaceCategory } from '.';

/**
 * Curated emoji set. The glyph itself is stored in `places.icon`, so changing
 * this list later needs no schema migration.
 */
export const PLACE_ICONS = [
  '🏠',
  '🏫',
  '💼',
  '🚌',
  '📍',
  '⭐️',
  '🛒',
  '🏥',
  '🍜',
  '⛽️',
  '🏢',
  '🏖️',
] as const;

/** Tag defaults, used until the user picks an icon of their own. */
export const CATEGORY_ICONS: Record<PlaceCategory, string> = {
  home: '🏠',
  school: '🏫',
  work: '💼',
  terminal: '🚌',
  other: '📍',
};

export function defaultIconFor(category: PlaceCategory): string {
  return CATEGORY_ICONS[category];
}
