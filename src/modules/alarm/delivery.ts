/**
 * Alarm delivery (plan Phase 6, D1/D4).
 *
 * Order is deliberate: notification first (robust), then audio (rich), then
 * vibration. Any of the last two may fail without losing the alert.
 *
 * This module never touches SQLite — screens and the engine own persistence —
 * so it can run from a background task as well as from a screen.
 */

import { capture } from '@/modules/diagnostics';

import type { ActiveAlarm, AlarmRequest } from '.';
import { ensureChannelsOnce } from './channels';
import {
  cancelNotification,
  dismissDeliveredAlarms,
  postAlarmNotification,
  scheduleSnoozeNotification,
} from './notifications';
import { configureAlarmAudio, startAlarmLoop, stopAlarmLoop } from './player';
import { startAlarmVibration, stopAlarmVibration } from './vibration';

let active: ActiveAlarm | null = null;
let snoozeTimer: ReturnType<typeof setTimeout> | null = null;
let snoozeNotificationId: string | null = null;

const listeners = new Set<(alarm: ActiveAlarm | null) => void>();

function emit(): void {
  for (const listener of listeners) listener(active);
}

export function subscribeToAlarm(listener: (alarm: ActiveAlarm | null) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getActiveAlarm(): ActiveAlarm | null {
  return active;
}

function clearSnoozeTimer(): void {
  if (snoozeTimer !== null) {
    clearTimeout(snoozeTimer);
    snoozeTimer = null;
  }
}

export async function deliverAlarm(request: AlarmRequest): Promise<void> {
  active = { ...request, startedAt: Date.now(), snoozedUntil: null };
  emit();

  await ensureChannelsOnce();
  await postAlarmNotification(request);

  await configureAlarmAudio();
  startAlarmLoop(request.sound, request.repeatUntilDismissed, request.customSoundUri);

  // Vibration can be a repeating pattern; it stops with the alarm.
  if (request.vibration) startAlarmVibration(request.vibrationRepeat);

  capture('trigger', 'alarm_delivered', {
    stage: request.stageIndex,
    repeat: request.repeatUntilDismissed,
    estimate: request.estimateOnly,
  });
}

/** Silences the current alert and its audio. Persistence is the caller's job. */
export async function dismissAlarmPresentation(): Promise<void> {
  clearSnoozeTimer();
  await cancelNotification(snoozeNotificationId);
  snoozeNotificationId = null;
  stopAlarmLoop();
  stopAlarmVibration();
  await dismissDeliveredAlarms();
  active = null;
  emit();
}

export async function snoozeAlarm(minutes: number): Promise<ActiveAlarm | null> {
  if (!active) return null;

  const snoozedUntil = Date.now() + minutes * 60_000;
  const request: AlarmRequest = { ...active, alertId: active.alertId };
  stopAlarmLoop();
  stopAlarmVibration();
  await dismissDeliveredAlarms();

  active = { ...active, snoozedUntil };
  emit();

  clearSnoozeTimer();
  await cancelNotification(snoozeNotificationId);
  snoozeNotificationId = await scheduleSnoozeNotification(request, minutes);

  snoozeTimer = setTimeout(() => {
    snoozeTimer = null;
    snoozeNotificationId = null;
    void deliverAlarm(request);
  }, minutes * 60_000);

  capture('trigger', 'alarm_snoozed', { minutes });
  return active;
}

/** "Wake now": cancels the snooze deadline and rings immediately. */
export async function wakeNow(): Promise<void> {
  if (!active) return;
  clearSnoozeTimer();
  await cancelNotification(snoozeNotificationId);
  snoozeNotificationId = null;

  const request: AlarmRequest = { ...active };
  active = { ...active, snoozedUntil: null };
  emit();

  await configureAlarmAudio();
  startAlarmLoop(request.sound, request.repeatUntilDismissed, request.customSoundUri);
  if (request.vibration) startAlarmVibration(request.vibrationRepeat);
}

export function isSnoozed(now = Date.now()): boolean {
  return active?.snoozedUntil !== null && active?.snoozedUntil !== undefined && now < active.snoozedUntil;
}
