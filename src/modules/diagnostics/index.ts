/**
 * Diagnostics — local, privacy-conscious event log (spec §10, plan D10).
 *
 * Phase 0 keeps a bounded in-memory ring buffer so the error boundary and
 * session events work before the database exists. Phase 1 replaces the sink
 * with the persisted `diagnostic_events` table; the call sites stay the same.
 *
 * Rule: never store coordinates, names or free text from the user here.
 */

export type DiagnosticKind =
  | 'journey'
  | 'location'
  | 'trigger'
  | 'permission'
  | 'db'
  | 'settings'
  | 'crash'
  | 'session';

export interface DiagnosticEvent {
  kind: DiagnosticKind;
  /** Short machine-readable name, e.g. `journey_started`. */
  name: string;
  timestamp: number;
  /** Non-sensitive metadata only (counts, statuses, versions). */
  meta?: Record<string, string | number | boolean | null>;
}

const MAX_EVENTS = 100;
const buffer: DiagnosticEvent[] = [];

export function capture(
  kind: DiagnosticKind,
  name: string,
  meta?: DiagnosticEvent['meta'],
): void {
  buffer.push({ kind, name, timestamp: Date.now(), meta });
  if (buffer.length > MAX_EVENTS) {
    buffer.splice(0, buffer.length - MAX_EVENTS);
  }

  if (__DEV__) {
    console.log(`[hinto:${kind}] ${name}`, meta ?? '');
  }
}

export function recentEvents(limit = MAX_EVENTS): DiagnosticEvent[] {
  return buffer.slice(-limit);
}

export function clearEvents(): void {
  buffer.length = 0;
}

/** Session marker so an unclean exit is visible later (D10). */
export function markSessionStart(): void {
  capture('session', 'app_started');
}
