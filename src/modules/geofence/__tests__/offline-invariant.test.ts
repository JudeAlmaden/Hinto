import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'node:fs';
import path from 'node:path';

/**
 * D17: from the moment a journey starts, nothing on the run path may perform a
 * network request. The alarm engine, the trigger maths, the journey lifecycle
 * and the alert delivery are checked as source, because that is where a
 * regression would be introduced.
 */
const RUN_PATH = [
  'src/modules/location/engine.ts',
  'src/modules/location/task.ts',
  'src/modules/location/session.ts',
  'src/modules/geofence/trigger.ts',
  'src/modules/geofence/distance.ts',
  'src/modules/journeys/service.ts',
  'src/modules/alarm/delivery.ts',
  'src/modules/alarm/notifications.ts',
  'src/modules/alarm/player.ts',
];

function read(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('offline run path (D17)', () => {
  it.each(RUN_PATH)('%s never calls the network', (file) => {
    const source = read(file);
    expect(source).not.toMatch(/\bfetch\s*\(/);
    expect(source).not.toMatch(/XMLHttpRequest/);
    expect(source).not.toMatch(/from 'axios'/);
    expect(source).not.toMatch(/NetInfo/);
  });

  it('keeps place search out of the run path', () => {
    for (const file of RUN_PATH) {
      expect(read(file)).not.toMatch(/places\/search/);
    }
  });

  it('keeps the geofence maths free of platform modules', () => {
    for (const file of ['src/modules/geofence/trigger.ts', 'src/modules/geofence/distance.ts']) {
      const source = read(file);
      expect(source).not.toMatch(/from 'expo-/);
      expect(source).not.toMatch(/from 'react-native'/);
    }
  });
});
