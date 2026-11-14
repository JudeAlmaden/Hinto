import { describe, expect, it } from '@jest/globals';

import type { SqlDatabase } from '../types';
import { isLegacyDevFixture, removeLegacyDevelopmentFixtures } from '../cleanup';

describe('legacy development fixtures', () => {
  it('recognises the exact seeded rows', () => {
    expect(isLegacyDevFixture({ name: 'Home', latitude: 14.5995, longitude: 120.9842 })).toBe(true);
    expect(isLegacyDevFixture({ name: 'Work', latitude: 14.5547, longitude: 121.0244 })).toBe(true);
  });

  it('leaves real places alone', () => {
    expect(isLegacyDevFixture({ name: 'Home', latitude: 13.9301, longitude: 121.4221 })).toBe(
      false,
    );
    expect(isLegacyDevFixture({ name: 'My Home', latitude: 14.5995, longitude: 120.9842 })).toBe(
      false,
    );
  });

  it('deletes only the fixture rows', async () => {
    const rows = [
      { id: 'fixture', name: 'Terminal', latitude: 14.5086, longitude: 121.0194 },
      { id: 'real', name: 'Candelaria', latitude: 13.9301, longitude: 121.4221 },
    ];
    const deleted: string[] = [];

    const db = {
      execAsync: async () => undefined,
      getAllAsync: async () => rows,
      getFirstAsync: async () => null,
      runAsync: async (_sql: string, ...params: unknown[]) => {
        deleted.push(String(params[0]));
        return { lastInsertRowId: 0, changes: 1 };
      },
      withTransactionAsync: async (task: () => Promise<void>) => task(),
    } as unknown as SqlDatabase;

    await expect(removeLegacyDevelopmentFixtures(db)).resolves.toBe(1);
    expect(deleted).toEqual(['fixture']);
  });
});
