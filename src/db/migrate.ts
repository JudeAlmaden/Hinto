/**
 * Migration runner and integrity checks (plan Phase 1, D6).
 *
 * Each migration runs inside one transaction together with the `user_version`
 * bump, so a partial migration can never be committed.
 */

import { LATEST_SCHEMA_VERSION, MIGRATIONS } from './migrations';
import type { SqlDatabase } from './types';

export class SchemaTooNewError extends Error {
  constructor(
    readonly found: number,
    readonly supported: number,
  ) {
    super(`Local database schema v${found} is newer than this build (v${supported}).`);
    this.name = 'SchemaTooNewError';
  }
}

export type MigrationReporter = (
  name: 'db_migrated' | 'db_schema_too_new',
  meta?: Record<string, string | number | boolean | null>,
) => void;

export async function getSchemaVersion(db: SqlDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  return row?.user_version ?? 0;
}

export async function runMigrations(db: SqlDatabase, report?: MigrationReporter): Promise<number> {
  const current = await getSchemaVersion(db);
  if (current > LATEST_SCHEMA_VERSION) {
    report?.('db_schema_too_new', { found: current, supported: LATEST_SCHEMA_VERSION });
    throw new SchemaTooNewError(current, LATEST_SCHEMA_VERSION);
  }

  for (const migration of MIGRATIONS) {
    if (migration.version <= current) continue;
    await db.withTransactionAsync(async () => {
      for (const statement of migration.statements) {
        await db.execAsync(statement);
      }
      await db.execAsync(`PRAGMA user_version = ${migration.version}`);
    });
    report?.('db_migrated', { version: migration.version });
  }

  return getSchemaVersion(db);
}

/** `PRAGMA integrity_check` returns a single `ok` row when the file is sound. */
export async function checkIntegrity(db: SqlDatabase): Promise<boolean> {
  const row = await db.getFirstAsync<Record<string, string>>('PRAGMA integrity_check');
  if (!row) return false;
  return Object.values(row)[0] === 'ok';
}

export interface StorageHealth {
  integrityOk: boolean;
  schemaVersion: number;
  latestSchemaVersion: number;
}

export async function checkStorageHealth(db: SqlDatabase): Promise<StorageHealth> {
  return {
    integrityOk: await checkIntegrity(db),
    schemaVersion: await getSchemaVersion(db),
    latestSchemaVersion: LATEST_SCHEMA_VERSION,
  };
}
