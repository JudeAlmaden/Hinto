/**
 * Diagnostics — local, privacy-conscious event log (spec §10, plan D10).
 *
 * A bounded in-memory ring buffer keeps the error boundary and session events
 * working even when storage is unavailable; once the database is open the
 * client installs a sink that also persists every event to `diagnostic_events`
 * (`./repository.ts`), keeping the call sites unchanged.
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

export type DiagnosticSink = (event: DiagnosticEvent) => void;

let sink: DiagnosticSink | null = null;

/** Installed by the database client once storage is healthy (or cleared on reset). */
export function configureDiagnosticsSink(next: DiagnosticSink | null): void {
  sink = next;
}

export function capture(
  kind: DiagnosticKind,
  name: string,
  meta?: DiagnosticEvent['meta'],
): void {
  const event: DiagnosticEvent = { kind, name, timestamp: Date.now(), meta };
  buffer.push(event);
  if (buffer.length > MAX_EVENTS) {
    buffer.splice(0, buffer.length - MAX_EVENTS);
  }

  if (__DEV__) {
    console.log(`[hinto:${kind}] ${name}`, meta ?? '');
  }

  // Persistence is best effort: diagnostics must never break a user flow.
  try {
    sink?.(event);
  } catch {
    // ignore
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
