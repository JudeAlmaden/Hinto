/**
 * Migration 001 — the spec §10 schema plus the multi-stage warning and metrics
 * additions from plan Phase 1 (audit B4/B5, D9, D10).
 *
 * Never edit this file once it has shipped: add `002_*.ts` and register it in
 * `./index.ts` instead.
 */

export const version = 1;

export const statements: readonly string[] = [
  `CREATE TABLE places (
    id TEXT PRIMARY KEY NOT NULL,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    icon TEXT,
    color TEXT,
    default_radius_m INTEGER NOT NULL,
    is_favorite INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )`,
  `CREATE INDEX places_favorite_idx ON places (is_favorite)`,
  `CREATE INDEX places_name_idx ON places (name COLLATE NOCASE)`,

  // A journey stores a destination snapshot so editing or deleting the source
  // place cannot change a journey that is already recorded (spec §4.3).
  `CREATE TABLE journeys (
    id TEXT PRIMARY KEY NOT NULL,
    place_id TEXT REFERENCES places (id) ON DELETE SET NULL,
    destination_name TEXT NOT NULL,
    destination_latitude REAL NOT NULL,
    destination_longitude REAL NOT NULL,
    radius_m INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN (
      'prepared', 'active', 'paused', 'triggered', 'completed', 'cancelled', 'interrupted'
    )),
    started_at INTEGER,
    triggered_at INTEGER,
    ended_at INTEGER,
    last_location_at INTEGER,
    last_known_distance_m REAL,
    alarm_dismissed_at INTEGER,
    entered_radius_at INTEGER,
    start_battery_pct INTEGER,
    end_battery_pct INTEGER,
    created_at INTEGER NOT NULL
  )`,
  `CREATE INDEX journeys_status_idx ON journeys (status)`,
  `CREATE INDEX journeys_started_idx ON journeys (started_at DESC)`,

  // Spec §4.4 allows several warning radii (e.g. 3 km *and* 1 km), which a
  // single radius_m column cannot express.
  `CREATE TABLE journey_alert_rules (
    id TEXT PRIMARY KEY NOT NULL,
    journey_id TEXT NOT NULL REFERENCES journeys (id) ON DELETE CASCADE,
    radius_m INTEGER NOT NULL,
    stage_index INTEGER NOT NULL,
    UNIQUE (journey_id, radius_m)
  )`,
  `CREATE INDEX journey_alert_rules_journey_idx ON journey_alert_rules (journey_id)`,

  `CREATE TABLE journey_alerts (
    id TEXT PRIMARY KEY NOT NULL,
    journey_id TEXT NOT NULL REFERENCES journeys (id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('primary', 'earlier', 'snooze')),
    stage_index INTEGER NOT NULL DEFAULT 0,
    trigger_distance_m REAL NOT NULL,
    accuracy_m REAL,
    triggered_at INTEGER NOT NULL,
    dismissed_at INTEGER,
    snoozed_until INTEGER
  )`,
  `CREATE INDEX journey_alerts_journey_idx ON journey_alerts (journey_id)`,

  // Values are JSON-encoded so a new key needs no migration (plan D5).
  `CREATE TABLE settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  )`,

  `CREATE TABLE diagnostic_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    kind TEXT NOT NULL,
    name TEXT NOT NULL,
    timestamp INTEGER NOT NULL,
    meta TEXT
  )`,
  `CREATE INDEX diagnostic_events_time_idx ON diagnostic_events (timestamp DESC)`,
];
