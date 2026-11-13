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
  journey: 'journey',
  alarm: 'alarm',
} as const;

export type AlarmAction = 'end' | 'snooze' | 'dismiss';

export interface AlarmRequest {
  journeyId: string;
  destinationName: string;
  distanceM: number;
  sound: AlarmSoundId;
  snoozeMinutes: number;
}
