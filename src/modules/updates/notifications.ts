/**
 * One quiet notification per release, on its own channel.
 *
 * The update channel is separate from `alarm-v1` so a version notice can never
 * borrow the alarm's sound, vibration or importance, and so users can mute it
 * without losing the alarm. Nothing here is scheduled ahead of time: the notice
 * is posted the moment a foreground check finds a newer release.
 */

import {
  AndroidImportance,
  getPermissionsAsync,
  scheduleNotificationAsync,
  setNotificationChannelAsync,
} from 'expo-notifications';
import { Platform } from 'react-native';

import { formatCopy, strings } from '@/constants/strings';
import { capture } from '@/modules/diagnostics';

import type { ReleaseInfo } from './release';

export const UPDATE_CHANNEL_ID = 'updates-v1';

export async function ensureUpdateChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;

  try {
    await setNotificationChannelAsync(UPDATE_CHANNEL_ID, {
      name: 'App updates',
      description: 'One notice when a new Hinto version is released.',
      importance: AndroidImportance.DEFAULT,
      showBadge: true,
      sound: null,
      enableVibrate: false,
    });
  } catch (error) {
    capture('update', 'update_channel_failed', {
      message: error instanceof Error ? error.message.slice(0, 160) : 'unknown',
    });
  }
}

/** True when the notice was actually delivered, so the caller can mark it sent. */
export async function postUpdateNotification(release: ReleaseInfo): Promise<boolean> {
  try {
    const permissions = await getPermissionsAsync();
    if (!permissions.granted) return false;

    await ensureUpdateChannel();
    await scheduleNotificationAsync({
      content: {
        title: formatCopy(strings.updates.notificationTitle, { version: release.version }),
        body: strings.updates.notificationBody,
        data: { updateVersion: release.version },
      },
      trigger: { channelId: UPDATE_CHANNEL_ID },
    });
    return true;
  } catch (error) {
    capture('update', 'update_notification_failed', {
      message: error instanceof Error ? error.message.slice(0, 160) : 'unknown',
    });
    return false;
  }
}
