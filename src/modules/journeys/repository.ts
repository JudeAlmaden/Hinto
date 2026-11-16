/**
 * Journeys repository (spec §10, plan Phases 5–8).
 *
 * A journey always stores its destination snapshot, so later edits or deletion
 * of the source place cannot change an in-flight or recorded journey (§4.3).
 */

import { MAX_RADIUS_M, MIN_RADIUS_M, isRadiusValid } from '@/constants/alarms';
import { createId } from '@/db/id';
import type { SqlDatabase, SqlValue } from '@/db/types';

import type { AlertType, Journey, JourneyAlert, JourneyAlertRule, JourneyStatus } from '.';

const JOURNEY_COLUMNS = `id, place_id, destination_name, destination_latitude, destination_longitude,
  radius_m, status, started_at, triggered_at, ended_at, last_location_at, last_known_distance_m,
  alarm_dismissed_at, entered_radius_at, start_battery_pct, end_battery_pct, created_at`;

interface JourneyRow {
  id: string;
  place_id: string | null;
  destination_name: string;
  destination_latitude: number;
  destination_longitude: number;
  radius_m: number;
  status: string;
  started_at: number | null;
  triggered_at: number | null;
  ended_at: number | null;
  last_location_at: number | null;
  last_known_distance_m: number | null;
  alarm_dismissed_at: number | null;
  entered_radius_at: number | null;
  start_battery_pct: number | null;
  end_battery_pct: number | null;
  created_at: number;
}

interface AlertRuleRow {
  id: string;
  journey_id: string;
  radius_m: number;
  stage_index: number;
}

interface AlertRow {
  id: string;
  journey_id: string;
  alert_type: string;
  stage_index: number;
  trigger_distance_m: number;
  accuracy_m: number | null;
  triggered_at: number;
  dismissed_at: number | null;
  snoozed_until: number | null;
}

export function mapJourneyRow(row: JourneyRow): Journey {
  return {
    id: row.id,
    placeId: row.place_id,
    destinationName: row.destination_name,
    destinationLatitude: row.destination_latitude,
    destinationLongitude: row.destination_longitude,
    radiusM: row.radius_m,
    status: row.status as JourneyStatus,
    startedAt: row.started_at,
    triggeredAt: row.triggered_at,
    endedAt: row.ended_at,
    lastLocationAt: row.last_location_at,
    lastKnownDistanceM: row.last_known_distance_m,
    alarmDismissedAt: row.alarm_dismissed_at,
    enteredRadiusAt: row.entered_radius_at,
    startBatteryPct: row.start_battery_pct,
    endBatteryPct: row.end_battery_pct,
    createdAt: row.created_at,
  };
}

export function mapAlertRuleRow(row: AlertRuleRow): JourneyAlertRule {
  return {
    id: row.id,
    journeyId: row.journey_id,
    radiusM: row.radius_m,
    stageIndex: row.stage_index,
  };
}

export function mapAlertRow(row: AlertRow): JourneyAlert {
  return {
    id: row.id,
    journeyId: row.journey_id,
    alertType: row.alert_type as AlertType,
    stageIndex: row.stage_index,
    triggerDistanceM: row.trigger_distance_m,
    accuracyM: row.accuracy_m,
    triggeredAt: row.triggered_at,
    dismissedAt: row.dismissed_at,
    snoozedUntil: row.snoozed_until,
  };
}

export interface NewJourney {
  placeId?: string | null;
  destinationName: string;
  destinationLatitude: number;
  destinationLongitude: number;
  radiusM: number;
  /** Extra warning stages, e.g. 3 km and 1 km (spec §4.4). */
  alertRules?: { radiusM: number; stageIndex: number }[];
}

export async function createJourney(db: SqlDatabase, input: NewJourney): Promise<Journey> {
  if (!input.destinationName.trim()) {
    throw new Error('A journey needs a destination name.');
  }
  if (!isRadiusValid(input.radiusM)) {
    throw new Error(`Radius must be between ${MIN_RADIUS_M} m and ${MAX_RADIUS_M} m.`);
  }
  if (
    !Number.isFinite(input.destinationLatitude) ||
    input.destinationLatitude < -90 ||
    input.destinationLatitude > 90 ||
    !Number.isFinite(input.destinationLongitude) ||
    input.destinationLongitude < -180 ||
    input.destinationLongitude > 180
  ) {
    throw new Error('Destination coordinates are out of range.');
  }

  const journey: Journey = {
    id: createId(),
    placeId: input.placeId ?? null,
    destinationName: input.destinationName.trim(),
    destinationLatitude: input.destinationLatitude,
    destinationLongitude: input.destinationLongitude,
    radiusM: input.radiusM,
    status: 'prepared',
    startedAt: null,
    triggeredAt: null,
    endedAt: null,
    lastLocationAt: null,
    lastKnownDistanceM: null,
    alarmDismissedAt: null,
    enteredRadiusAt: null,
    startBatteryPct: null,
    endBatteryPct: null,
    createdAt: Date.now(),
  };

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO journeys (${JOURNEY_COLUMNS}) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      journey.id,
      journey.placeId,
      journey.destinationName,
      journey.destinationLatitude,
      journey.destinationLongitude,
      journey.radiusM,
      journey.status,
      journey.startedAt,
      journey.triggeredAt,
      journey.endedAt,
      journey.lastLocationAt,
      journey.lastKnownDistanceM,
      journey.alarmDismissedAt,
      journey.enteredRadiusAt,
      journey.startBatteryPct,
      journey.endBatteryPct,
      journey.createdAt,
    );

    for (const rule of input.alertRules ?? []) {
      await db.runAsync(
        'INSERT INTO journey_alert_rules (id, journey_id, radius_m, stage_index) VALUES (?, ?, ?, ?)',
        createId(),
        journey.id,
        rule.radiusM,
        rule.stageIndex,
      );
    }
  });

  return journey;
}

export async function getJourney(db: SqlDatabase, id: string): Promise<Journey | null> {
  const row = await db.getFirstAsync<JourneyRow>(
    `SELECT ${JOURNEY_COLUMNS} FROM journeys WHERE id = ?`,
    id,
  );
  return row ? mapJourneyRow(row) : null;
}

/** The journey the engine should resume after a restart, if any. */
export async function getActiveJourney(db: SqlDatabase): Promise<Journey | null> {
  const row = await db.getFirstAsync<JourneyRow>(
    `SELECT ${JOURNEY_COLUMNS} FROM journeys
     WHERE status IN ('active', 'paused', 'triggered')
     ORDER BY created_at DESC LIMIT 1`,
  );
  return row ? mapJourneyRow(row) : null;
}

export async function listJourneys(
  db: SqlDatabase,
  options: { statuses?: JourneyStatus[]; placeId?: string; limit?: number } = {},
): Promise<Journey[]> {
  const { statuses, placeId, limit = 50 } = options;
  const params: SqlValue[] = [];
  const conditions: string[] = [];
  if (statuses && statuses.length > 0) {
    conditions.push(`status IN (${statuses.map(() => '?').join(', ')})`);
    params.push(...statuses);
  }
  if (placeId) {
    conditions.push('place_id = ?');
    params.push(placeId);
  }
  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  params.push(limit);

  const rows = await db.getAllAsync<JourneyRow>(
    `SELECT ${JOURNEY_COLUMNS} FROM journeys ${where} ORDER BY created_at DESC LIMIT ?`,
    ...params,
  );
  return rows.map(mapJourneyRow);
}

export type JourneyPatch = Partial<
  Pick<
    Journey,
    | 'status'
    | 'startedAt'
    | 'triggeredAt'
    | 'endedAt'
    | 'lastLocationAt'
    | 'lastKnownDistanceM'
    | 'alarmDismissedAt'
    | 'enteredRadiusAt'
    | 'startBatteryPct'
    | 'endBatteryPct'
  >
>;

const PATCH_COLUMNS: Record<keyof JourneyPatch, string> = {
  status: 'status',
  startedAt: 'started_at',
  triggeredAt: 'triggered_at',
  endedAt: 'ended_at',
  lastLocationAt: 'last_location_at',
  lastKnownDistanceM: 'last_known_distance_m',
  alarmDismissedAt: 'alarm_dismissed_at',
  enteredRadiusAt: 'entered_radius_at',
  startBatteryPct: 'start_battery_pct',
  endBatteryPct: 'end_battery_pct',
};

export async function updateJourney(
  db: SqlDatabase,
  id: string,
  patch: JourneyPatch,
): Promise<void> {
  const assignments: string[] = [];
  const params: SqlValue[] = [];

  for (const key of Object.keys(PATCH_COLUMNS) as (keyof JourneyPatch)[]) {
    const value = patch[key];
    if (value === undefined) continue;
    assignments.push(`${PATCH_COLUMNS[key]} = ?`);
    params.push(value);
  }

  if (assignments.length === 0) return;
  params.push(id);
  await db.runAsync(`UPDATE journeys SET ${assignments.join(', ')} WHERE id = ?`, ...params);
}

export async function deleteJourney(db: SqlDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM journeys WHERE id = ?', id);
}

export async function listAlertRules(
  db: SqlDatabase,
  journeyId: string,
): Promise<JourneyAlertRule[]> {
  const rows = await db.getAllAsync<AlertRuleRow>(
    'SELECT id, journey_id, radius_m, stage_index FROM journey_alert_rules WHERE journey_id = ? ORDER BY stage_index ASC',
    journeyId,
  );
  return rows.map(mapAlertRuleRow);
}

export interface NewJourneyAlert {
  journeyId: string;
  alertType: AlertType;
  stageIndex?: number;
  triggerDistanceM: number;
  accuracyM?: number | null;
  triggeredAt?: number;
}

export async function addJourneyAlert(
  db: SqlDatabase,
  input: NewJourneyAlert,
): Promise<JourneyAlert> {
  const alert: JourneyAlert = {
    id: createId(),
    journeyId: input.journeyId,
    alertType: input.alertType,
    stageIndex: input.stageIndex ?? 0,
    triggerDistanceM: input.triggerDistanceM,
    accuracyM: input.accuracyM ?? null,
    triggeredAt: input.triggeredAt ?? Date.now(),
    dismissedAt: null,
    snoozedUntil: null,
  };

  await db.runAsync(
    `INSERT INTO journey_alerts
       (id, journey_id, alert_type, stage_index, trigger_distance_m, accuracy_m, triggered_at, dismissed_at, snoozed_until)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    alert.id,
    alert.journeyId,
    alert.alertType,
    alert.stageIndex,
    alert.triggerDistanceM,
    alert.accuracyM,
    alert.triggeredAt,
    alert.dismissedAt,
    alert.snoozedUntil,
  );

  return alert;
}

export async function listJourneyAlerts(
  db: SqlDatabase,
  journeyId: string,
): Promise<JourneyAlert[]> {
  const rows = await db.getAllAsync<AlertRow>(
    'SELECT * FROM journey_alerts WHERE journey_id = ? ORDER BY triggered_at ASC',
    journeyId,
  );
  return rows.map(mapAlertRow);
}

export async function dismissJourneyAlert(
  db: SqlDatabase,
  id: string,
  dismissedAt = Date.now(),
): Promise<void> {
  await db.runAsync(
    'UPDATE journey_alerts SET dismissed_at = ?, snoozed_until = NULL WHERE id = ?',
    dismissedAt,
    id,
  );
}

export async function snoozeJourneyAlert(
  db: SqlDatabase,
  id: string,
  until: number,
): Promise<void> {
  await db.runAsync('UPDATE journey_alerts SET snoozed_until = ? WHERE id = ?', until, id);
}

/** Clears a snooze deadline ("Wake now"). */
export async function clearJourneyAlertSnooze(db: SqlDatabase, id: string): Promise<void> {
  await db.runAsync('UPDATE journey_alerts SET snoozed_until = NULL WHERE id = ?', id);
}

/** Newest alert for a journey, used by the alarm screen. */
export async function getLatestJourneyAlert(
  db: SqlDatabase,
  journeyId: string,
): Promise<JourneyAlert | null> {
  const row = await db.getFirstAsync<AlertRow>(
    'SELECT * FROM journey_alerts WHERE journey_id = ? ORDER BY triggered_at DESC LIMIT 1',
    journeyId,
  );
  return row ? mapAlertRow(row) : null;
}

/** Alerts for several journeys in one query (History avoids N+1). */
export async function listAlertsForJourneys(
  db: SqlDatabase,
  journeyIds: readonly string[],
): Promise<JourneyAlert[]> {
  if (journeyIds.length === 0) return [];
  const placeholders = journeyIds.map(() => '?').join(', ');
  const rows = await db.getAllAsync<AlertRow>(
    `SELECT * FROM journey_alerts WHERE journey_id IN (${placeholders}) ORDER BY triggered_at ASC`,
    ...journeyIds,
  );
  return rows.map(mapAlertRow);
}

/**
 * Replaces every warning rule for a journey (journey options sheet, plan
 * Phase 7). Stage indexes run from 0 (earliest) up to the primary radius, which
 * always has the highest index.
 */
export async function replaceAlertRules(
  db: SqlDatabase,
  journeyId: string,
  rules: readonly { radiusM: number; stageIndex: number }[],
): Promise<void> {
  const primary = rules.reduce(
    (innermost, rule) => (rule.stageIndex > innermost.stageIndex ? rule : innermost),
    rules[0],
  );

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM journey_alert_rules WHERE journey_id = ?', journeyId);
    for (const rule of rules) {
      await db.runAsync(
        'INSERT INTO journey_alert_rules (id, journey_id, radius_m, stage_index) VALUES (?, ?, ?, ?)',
        createId(),
        journeyId,
        rule.radiusM,
        rule.stageIndex,
      );
    }
    if (primary) {
      await db.runAsync('UPDATE journeys SET radius_m = ? WHERE id = ?', primary.radiusM, journeyId);
    }
  });
}

/** Changes only the primary radius, keeping earlier warnings (Phase 7). */
export async function updatePrimaryRadius(
  db: SqlDatabase,
  journeyId: string,
  radiusM: number,
): Promise<void> {
  if (!isRadiusValid(radiusM)) {
    throw new Error(`Radius must be between ${MIN_RADIUS_M} m and ${MAX_RADIUS_M} m.`);
  }
  const existing = await listAlertRules(db, journeyId);
  const primaryIndex = existing.length > 0 ? Math.max(...existing.map((rule) => rule.stageIndex)) : 0;
  const earlier = existing.filter((rule) => rule.stageIndex < primaryIndex);

  await replaceAlertRules(db, journeyId, [
    ...earlier.map((rule) => ({ radiusM: rule.radiusM, stageIndex: rule.stageIndex })),
    { radiusM, stageIndex: primaryIndex },
  ]);
}

/** Destinations for Home's "Recent" list, newest first, de-duplicated by name+point. */
export async function listRecentDestinations(
  db: SqlDatabase,
  limit = 5,
) {
  const rows = await db.getAllAsync<{
    name: string;
    latitude: number;
    longitude: number;
    place_id: string | null;
    last_used_at: number;
  }>(
    // Only destinations that were actually travelled to count as recent. A
    // prepared draft (journey setup opened and abandoned) or a cancelled row
    // must never show up here — dropping a pin alone saves nothing.
    `SELECT destination_name AS name, destination_latitude AS latitude,
            destination_longitude AS longitude, place_id, MAX(created_at) AS last_used_at
     FROM journeys
     WHERE status IN ('active', 'paused', 'triggered', 'completed', 'interrupted')
     GROUP BY destination_name, destination_latitude, destination_longitude
     ORDER BY last_used_at DESC
     LIMIT ?`,
    limit,
  );

  return rows.map((row) => ({
    name: row.name,
    latitude: row.latitude,
    longitude: row.longitude,
    placeId: row.place_id,
    lastUsedAt: row.last_used_at,
  }));
}

/** Removes terminal journeys only; an active journey is never deleted (Phase 8). */
export async function clearJourneyHistory(db: SqlDatabase): Promise<void> {
  await db.runAsync(
    "DELETE FROM journeys WHERE status IN ('completed', 'cancelled', 'interrupted')",
  );
}

/** "Delete all data": places, journeys and diagnostics. Settings survive. */
export async function deleteAllData(db: SqlDatabase): Promise<void> {
  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM journeys');
    await db.runAsync('DELETE FROM places');
    await db.runAsync('DELETE FROM diagnostic_events');
  });
}
