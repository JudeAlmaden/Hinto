/**
 * Persisted diagnostics (plan D10).
 *
 * Screens and the error boundary keep calling `capture()`; this module is only
 * the storage side and stays free of UI concerns.
 */

import type { SqlDatabase } from '@/db/types';

import type { DiagnosticEvent, DiagnosticKind } from '.';

/** Keep the log small; old rows are pruned after every batch of writes. */
export const DIAGNOSTIC_RETENTION_ROWS = 500;

interface DiagnosticEventRow {
  id: number;
  kind: string;
  name: string;
  timestamp: number;
  meta: string | null;
}

function parseMeta(raw: string | null): DiagnosticEvent['meta'] {
  if (!raw) return undefined;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as DiagnosticEvent['meta'];
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function mapDiagnosticEventRow(row: DiagnosticEventRow): DiagnosticEvent {
  return {
    kind: row.kind as DiagnosticKind,
    name: row.name,
    timestamp: row.timestamp,
    meta: parseMeta(row.meta),
  };
}

export async function insertDiagnosticEvent(
  db: SqlDatabase,
  event: DiagnosticEvent,
): Promise<void> {
  await db.runAsync(
    'INSERT INTO diagnostic_events (kind, name, timestamp, meta) VALUES (?, ?, ?, ?)',
    event.kind,
    event.name,
    event.timestamp,
    event.meta ? JSON.stringify(event.meta) : null,
  );
}

/** Newest first. */
export async function listDiagnosticEvents(
  db: SqlDatabase,
  limit = 100,
): Promise<DiagnosticEvent[]> {
  const rows = await db.getAllAsync<DiagnosticEventRow>(
    'SELECT id, kind, name, timestamp, meta FROM diagnostic_events ORDER BY id DESC LIMIT ?',
    limit,
  );
  return rows.map(mapDiagnosticEventRow);
}

export async function pruneDiagnosticEvents(
  db: SqlDatabase,
  keep = DIAGNOSTIC_RETENTION_ROWS,
): Promise<void> {
  await db.runAsync(
    `DELETE FROM diagnostic_events
     WHERE id NOT IN (SELECT id FROM diagnostic_events ORDER BY id DESC LIMIT ?)`,
    keep,
  );
}

export async function clearDiagnosticEvents(db: SqlDatabase): Promise<void> {
  await db.runAsync('DELETE FROM diagnostic_events');
}
