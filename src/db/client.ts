/**
 * Database client (plan Phase 1, D6).
 *
 * One handle per process, opened lazily. A background task runs in its own JS
 * context, so this module — not a React provider — owns the connection: call
 * `openDatabase()` from anywhere and the migration/health work happens once.
 */

import { File } from 'expo-file-system';
import * as SQLite from 'expo-sqlite';

import { capture, configureDiagnosticsSink } from '@/modules/diagnostics';
import { insertDiagnosticEvent, pruneDiagnosticEvents } from '@/modules/diagnostics/repository';

import { SchemaTooNewError, checkIntegrity, runMigrations } from './migrate';
import { removeLegacyDevelopmentFixtures } from './cleanup';
import type { SqlDatabase } from './types';

export const DATABASE_NAME = 'hinto.db';

/** Diagnostics are pruned after this many persisted writes. */
const PRUNE_EVERY_WRITES = 25;

export type StorageState = 'loading' | 'ok' | 'unavailable';

export interface StorageSnapshot {
  state: StorageState;
  schemaVersion: number;
  integrityOk: boolean;
  /** Last open error, safe to show in diagnostics (never contains user data). */
  error: string | null;
}

let snapshot: StorageSnapshot = {
  state: 'loading',
  schemaVersion: 0,
  integrityOk: false,
  error: null,
};

const listeners = new Set<() => void>();
let handle: SQLite.SQLiteDatabase | null = null;
let opening: Promise<SQLite.SQLiteDatabase> | null = null;
let persistedWrites = 0;

function update(patch: Partial<StorageSnapshot>): void {
  snapshot = { ...snapshot, ...patch };
  for (const listener of listeners) listener();
}

export function getStorageSnapshot(): StorageSnapshot {
  return snapshot;
}

/** For `useSyncExternalStore` consumers (storage card, diagnostics screen). */
export function subscribeToStorage(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

async function prepare(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  handle = db;

  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  const integrityOk = await checkIntegrity(db);
  if (!integrityOk) {
    throw new Error('Local database failed its integrity check.');
  }

  // Persist new diagnostic events while the database is healthy. Best effort:
  // a failed write must never surface to the user.
  configureDiagnosticsSink((event) => {
    void insertDiagnosticEvent(db, event)
      .then(async () => {
        persistedWrites += 1;
        if (persistedWrites % PRUNE_EVERY_WRITES === 0) {
          await pruneDiagnosticEvents(db);
        }
      })
      .catch(() => undefined);
  });

  const schemaVersion = await runMigrations(db, (name, meta) => capture('db', name, meta));

  if (__DEV__) {
    // Old debug builds seeded three fake places; drop them without touching
    // anything the user saved.
    await removeLegacyDevelopmentFixtures(db).catch(() => undefined);
  }

  update({ state: 'ok', schemaVersion, integrityOk, error: null });
  return db;
}

/**
 * Opens (and migrates) the database exactly once. Rejects when storage is
 * unusable; callers should check `getStorageSnapshot().state` for the UI.
 */
export function openDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (opening) return opening;

  const attempt = prepare();
  opening = attempt;
  attempt.catch((error: unknown) => {
    opening = null;
    update({ state: 'unavailable', error: describeError(error) });
    capture('db', 'db_open_failed', {
      reason: error instanceof SchemaTooNewError ? 'schema_too_new' : 'open_failed',
      message: describeError(error),
    });
  });

  return attempt;
}

/** Closes the handle so the file can be deleted or replaced. */
export async function closeDatabase(): Promise<void> {
  const db = handle;
  handle = null;
  opening = null;
  configureDiagnosticsSink(null);
  if (db) {
    await db.closeAsync();
  }
}

/** Closes and reopens without touching data (D6 "Retry"). */
export async function retryStorage(): Promise<void> {
  await closeDatabase();
  update({ state: 'loading', schemaVersion: 0, integrityOk: false, error: null });
  await openDatabase().catch(() => undefined);
}

/**
 * Recreates an empty database (D6 "Reset local data"). Always user-initiated.
 *
 * The old file is copied to `hinto.db.corrupt-<timestamp>` first so diagnostics
 * can export it; only the main database file is copied, which is enough to
 * inspect the schema after the WAL checkpoint performed on close.
 */
export async function resetStorage(): Promise<void> {
  await closeDatabase();

  let backupCreated = false;
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  try {
    // `defaultDatabaseDirectory` is the folder expo-sqlite actually uses, which
    // differs per platform; never hardcode it.
    const source = new File(SQLite.defaultDatabaseDirectory, DATABASE_NAME);
    if (source.exists) {
      source.copy(new File(SQLite.defaultDatabaseDirectory, `${DATABASE_NAME}.corrupt-${stamp}`));
      backupCreated = true;
    }
  } catch {
    backupCreated = false;
  }

  await SQLite.deleteDatabaseAsync(DATABASE_NAME);
  update({ state: 'loading', schemaVersion: 0, integrityOk: false, error: null });
  await openDatabase();
  capture('db', 'db_reset', { backup: backupCreated });
}

/** Convenience for repositories that already hold the handle. */
export async function getDatabase(): Promise<SqlDatabase> {
  return openDatabase();
}
