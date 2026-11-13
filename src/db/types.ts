/**
 * The narrow database surface the repositories depend on.
 *
 * `expo-sqlite`'s `SQLiteDatabase` satisfies this interface structurally, so
 * repositories are unit-testable against any SQLite driver and stay usable from
 * a background task, where React context is unavailable (Phase 5).
 */

export type SqlValue = string | number | boolean | null;

export interface SqlRunResult {
  lastInsertRowId: number;
  changes: number;
}

export interface SqlDatabase {
  execAsync(source: string): Promise<void>;
  runAsync(source: string, ...params: SqlValue[]): Promise<SqlRunResult>;
  getAllAsync<T>(source: string, ...params: SqlValue[]): Promise<T[]>;
  getFirstAsync<T>(source: string, ...params: SqlValue[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
