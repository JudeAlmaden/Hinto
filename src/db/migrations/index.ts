/**
 * Forward-only migration registry (plan Phase 1, D6).
 *
 * Every later phase appends a numbered file here rather than editing an earlier
 * one. `PRAGMA user_version` records the last applied version.
 */

import { statements as initialStatements, version as initialVersion } from './001_initial';
import {
  statements as startDistanceStatements,
  version as startDistanceVersion,
} from './002_journey_start_distance';

export interface Migration {
  version: number;
  statements: readonly string[];
}

export const MIGRATIONS: readonly Migration[] = [
  { version: initialVersion, statements: initialStatements },
  { version: startDistanceVersion, statements: startDistanceStatements },
].sort((a, b) => a.version - b.version);

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0;
