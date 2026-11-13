/**
 * Alarm — sound, vibration, snooze and dismissal (plan Phase 6, D1/D4).
 *
 * Two tiers: the OS-delivered notification on the `alarm` channel is the robust
 * path, and looping audio is layered on top.
 */

export type AlarmSoundId = 'classic' | 'chime' | 'beep';

export const ALARM_SOUNDS: readonly AlarmSoundId[] = ['classic', 'chime', 'beep'] as const;

/** Channel ids are versioned because Android applies channel settings only at creation. */
export const NOTIFICATION_CHANNELS = {
  journey: 'journey-v1',
  alarm: 'alarm-v1',
} as const;

export type AlarmAction = 'end' | 'snooze' | 'dismiss';

export interface AlarmRequest {
  journeyId: string;
  alertId: string | null;
  destinationName: string;
  distanceM: number;
  sound: AlarmSoundId;
  snoozeMinutes: number;
  vibration: boolean;
  repeatUntilDismissed: boolean;
  stageIndex: number;
  /** The stage was inferred from a segment crossing, not a point inside it. */
  estimateOnly: boolean;
}

export interface ActiveAlarm extends AlarmRequest {
  startedAt: number;
  snoozedUntil: number | null;
}
