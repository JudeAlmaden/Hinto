import { describe, expect, it } from '@jest/globals';

import { LATEST_SCHEMA_VERSION, MIGRATIONS } from '../migrations';

const schema = MIGRATIONS.flatMap((migration) => migration.statements).join('\n');

describe('migration registry', () => {
  it('is ordered by unique, ascending versions', () => {
    const versions = MIGRATIONS.map((migration) => migration.version);
    expect(versions).toEqual([...versions].sort((a, b) => a - b));
    expect(new Set(versions).size).toBe(versions.length);
  });

  it('reports the last registered version', () => {
    expect(LATEST_SCHEMA_VERSION).toBe(1);
    expect(MIGRATIONS.at(-1)?.version).toBe(LATEST_SCHEMA_VERSION);
  });

  it('contains no empty statements', () => {
    for (const migration of MIGRATIONS) {
      expect(migration.statements.length).toBeGreaterThan(0);
      for (const statement of migration.statements) {
        expect(statement.trim().length).toBeGreaterThan(0);
      }
    }
  });
});

describe('initial schema', () => {
  it('creates every table from spec §10', () => {
    for (const table of [
      'places',
      'journeys',
      'journey_alerts',
      'journey_alert_rules',
      'settings',
      'diagnostic_events',
    ]) {
      expect(schema).toContain(`CREATE TABLE ${table}`);
    }
  });

  it('supports several warning radii per journey (audit B4)', () => {
    expect(schema).toContain('UNIQUE (journey_id, radius_m)');
    expect(schema).toMatch(/journey_alert_rules[\s\S]*stage_index/);
  });

  it('keeps the metrics and alert detail columns (D9, audit B5)', () => {
    expect(schema).toContain('entered_radius_at');
    expect(schema).toContain('start_battery_pct');
    expect(schema).toContain('end_battery_pct');
    expect(schema).toContain('accuracy_m');
    expect(schema).toContain("CHECK (alert_type IN ('primary', 'earlier', 'snooze'))");
  });

  it('cascades alert rows with their journey but keeps journeys when a place goes', () => {
    expect(schema).toMatch(
      /journey_id TEXT NOT NULL REFERENCES journeys \(id\) ON DELETE CASCADE/,
    );
    expect(schema).toMatch(/place_id TEXT REFERENCES places \(id\) ON DELETE SET NULL/);
  });

  it('creates the indices the queries rely on', () => {
    for (const index of [
      'places_favorite_idx',
      'journeys_status_idx',
      'journeys_started_idx',
      'journey_alert_rules_journey_idx',
      'journey_alerts_journey_idx',
      'diagnostic_events_time_idx',
    ]) {
      expect(schema).toContain(`CREATE INDEX ${index}`);
    }
  });
});
