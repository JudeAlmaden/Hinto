/**
 * Alarm vibration (plan D1).
 *
 * Android repeats a `Vibration` pattern until it is cancelled, which is what
 * "vibrate until dismissed" needs: a single haptic is easy to sleep through.
 * The motor follows the same ceiling as the audio loop, so a phone left in a
 * bag stops instead of buzzing all day.
 */

import { Vibration } from 'react-native';

import { ALARM_LOOP_CEILING_MS } from '@/constants/alarms';
import { capture } from '@/modules/diagnostics';

/** 700 ms on, 500 ms off, repeated by the OS until cancelled. */
export const VIBRATION_PATTERN = [0, 700, 500];
const SINGLE_BUZZ_MS = 900;

let running = false;
let ceilingTimer: ReturnType<typeof setTimeout> | null = null;

function clearCeiling(): void {
  if (ceilingTimer !== null) {
    clearTimeout(ceilingTimer);
    ceilingTimer = null;
  }
}

/**
 * `repeat` keeps the pattern going until `stopAlarmVibration()`; otherwise the
 * phone buzzes once and stops, matching the audio's non-looping mode.
 */
export function startAlarmVibration(repeat: boolean): void {
  stopAlarmVibration();

  try {
    if (repeat) {
      Vibration.vibrate([...VIBRATION_PATTERN], true);
    } else {
      Vibration.vibrate(SINGLE_BUZZ_MS, false);
    }
    running = true;
  } catch (error) {
    capture('trigger', 'vibration_failed', {
      message: error instanceof Error ? error.message.slice(0, 160) : 'unknown',
    });
    return;
  }

  if (repeat) {
    ceilingTimer = setTimeout(() => {
      stopAlarmVibration();
      capture('trigger', 'vibration_ceiling_reached');
    }, ALARM_LOOP_CEILING_MS);
  }
}

export function stopAlarmVibration(): void {
  clearCeiling();
  if (!running) return;
  running = false;
  try {
    Vibration.cancel();
  } catch {
    // Nothing else to do; the motor stopping is best effort.
  }
}

export function isAlarmVibrating(): boolean {
  return running;
}
