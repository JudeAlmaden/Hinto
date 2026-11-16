/**
 * OS-delivered alarm notifications (plan D1).
 *
 * The notification is posted *immediately* on the alarm channel — not scheduled
 * for a wall-clock time — so there is no exact-alarm permission and the OS plays
 * the channel sound even if JavaScript is suspended a moment later.
 */

import * as Notifications from 'expo-notifications';

import { formatCopy, strings } from '@/constants/strings';
import { capture } from '@/modules/diagnostics';
import { formatDistance } from '@/utils/format';

import type { AlarmRequest } from '.';
import { ALARM_CATEGORY_ID, ALARM_CHANNEL_ID, soundFileName } from './channels';

export function alarmDeepLink(journeyId: string): string {
  return `/alarm?journeyId=${encodeURIComponent(journeyId)}`;
}

/** Foreground presentation: show the banner and let the channel make noise. */
export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export async function postAlarmNotification(request: AlarmRequest): Promise<void> {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: strings.alarm.headline,
        body: `${request.destinationName} · ${formatCopy(strings.alarm.away, {
          distance: formatDistance(request.distanceM, 'km'),
        })}`,
        sound: soundFileName(request.sound),
        categoryIdentifier: ALARM_CATEGORY_ID,
        data: {
          url: alarmDeepLink(request.journeyId),
          journeyId: request.journeyId,
          alertId: request.alertId,
        },
      },
      trigger: { channelId: ALARM_CHANNEL_ID },
    });
  } catch (error) {
    capture('trigger', 'notification_failed', {
      message: error instanceof Error ? error.message.slice(0, 160) : 'unknown',
    });
  }
}

/** Snooze is a wall-clock deadline; inexact delivery is acceptable for it. */
export async function scheduleSnoozeNotification(
  request: AlarmRequest,
  minutes: number,
): Promise<string | null> {
  try {
    return await Notifications.scheduleNotificationAsync({
      content: {
        title: strings.alarm.headline,
        body: `${request.destinationName} · ${formatCopy(strings.alarm.away, {
          distance: formatDistance(request.distanceM, 'km'),
        })}`,
        sound: soundFileName(request.sound),
        categoryIdentifier: ALARM_CATEGORY_ID,
        data: { url: alarmDeepLink(request.journeyId), journeyId: request.journeyId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: Math.max(60, Math.round(minutes * 60)),
        channelId: ALARM_CHANNEL_ID,
      },
    });
  } catch (error) {
    capture('trigger', 'snooze_schedule_failed', {
      message: error instanceof Error ? error.message.slice(0, 160) : 'unknown',
    });
    return null;
  }
}

export async function cancelNotification(identifier: string | null): Promise<void> {
  if (!identifier) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // Already delivered or cancelled.
  }
}

export async function dismissDeliveredAlarms(): Promise<void> {
  try {
    await Notifications.dismissAllNotificationsAsync();
  } catch {
    // ignore
  }
}

/** Journey id carried by a tapped alarm notification, if any. */
export function extractAlarmJourneyId(
  response: Notifications.NotificationResponse | null,
): string | null {
  const data = response?.notification.request.content.data;
  if (!data) return null;
  const journeyId = data.journeyId;
  return typeof journeyId === 'string' ? journeyId : null;
}
