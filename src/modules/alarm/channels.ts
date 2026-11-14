/**
 * Notification channels (plan D1, Phase 6 item 3).
 *
 * Android applies channel settings only at creation, so the ids are versioned
 * (`alarm-v1`) instead of mutating a channel the user may have customised.
 */

import {
  AndroidAudioContentType,
  AndroidAudioUsage,
  AndroidImportance,
  AndroidNotificationVisibility,
  setNotificationChannelAsync,
} from 'expo-notifications';
import { Platform } from 'react-native';

import { capture } from '@/modules/diagnostics';

import { NOTIFICATION_CHANNELS } from '.';

export const ALARM_CHANNEL_ID = NOTIFICATION_CHANNELS.alarm;
export const JOURNEY_CHANNEL_ID = NOTIFICATION_CHANNELS.journey;

let configured = false;

export async function ensureNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    await setNotificationChannelAsync(JOURNEY_CHANNEL_ID, {
      name: 'Journey tracking',
      description: 'Shown while Hinto is tracking an active journey.',
      importance: AndroidImportance.LOW,
      showBadge: false,
      sound: null,
      enableVibrate: false,
    });

    await setNotificationChannelAsync(ALARM_CHANNEL_ID, {
      name: 'Alarm',
      description: 'The audible alert before your stop.',
      importance: AndroidImportance.MAX,
      sound: 'alarm_classic.wav',
      enableVibrate: true,
      vibrationPattern: [0, 600, 400, 600, 400, 600],
      bypassDnd: true,
      showBadge: true,
      lockscreenVisibility: AndroidNotificationVisibility.PUBLIC,
      audioAttributes: {
        usage: AndroidAudioUsage.ALARM,
        contentType: AndroidAudioContentType.SONIFICATION,
        flags: {
          enforceAudibility: true,
          requestHardwareAudioVideoSynchronization: false,
        },
      },
    });

    configured = true;
  } catch (error) {
    capture('permission', 'channel_setup_failed', {
      message: error instanceof Error ? error.message.slice(0, 160) : 'unknown',
    });
  }
}

/** Idempotent convenience for screens that may mount before the root layout. */
export async function ensureChannelsOnce(): Promise<void> {
  if (configured) return;
  await ensureNotificationChannels();
}

/** Base filename of the bundled alarm sound, as Android expects it. */
export function soundFileName(sound: 'classic' | 'chime' | 'beep'): string {
  // Android resource names reject hyphens, so the bundled files use `_`.
  return `alarm_${sound}.wav`;
}
