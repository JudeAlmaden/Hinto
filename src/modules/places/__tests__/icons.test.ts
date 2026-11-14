import { describe, expect, it } from '@jest/globals';

import { PLACE_CATEGORIES } from '..';
import { CATEGORY_ICONS, PLACE_ICONS, defaultIconFor } from '../icons';

describe('place icons', () => {
  it('gives every tag a default icon that the picker offers', () => {
    for (const category of PLACE_CATEGORIES) {
      const icon = defaultIconFor(category);
      expect(icon).toBe(CATEGORY_ICONS[category]);
      expect(PLACE_ICONS).toContain(icon);
    }
  });

  it('offers each icon once', () => {
    expect(new Set<string>(PLACE_ICONS).size).toBe(PLACE_ICONS.length);
  });
});
