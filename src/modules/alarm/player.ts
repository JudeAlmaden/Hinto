/**
 * Alarm audio loop (plan D1, Phase 6 item 1).
 *
 * Audio is the second tier, never the only one. Session settings are deliberate:
 * `playsInSilentMode` keeps the alarm audible when the ringer is silent, and
 * lock-screen controls are required or Android stops playback after ~3 minutes.
 *
 * Every call is guarded: a failure here must not stop the notification from
 * having been posted.
 */

import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { ALARM_LOOP_CEILING_MS } from '@/constants/alarms';
import { capture } from '@/modules/diagnostics';

import type { AlarmSoundId } from '.';

const SOURCES: Record<AlarmSoundId, number> = {
  classic: require('@/assets/sounds/alarm-classic.wav'),
  chime: require('@/assets/sounds/alarm-chime.wav'),
  beep: require('@/assets/sounds/alarm-beep.wav'),
};

let player: AudioPlayer | null = null;
let ceilingTimer: ReturnType<typeof setTimeout> | null = null;
let sessionConfigured = false;

export async function configureAlarmAudio(): Promise<void> {
  if (sessionConfigured) return;
  try {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: true,
      interruptionMode: 'doNotMix',
    });
    sessionConfigured = true;
  } catch (error) {
    capture('trigger', 'audio_mode_failed', {
      message: error instanceof Error ? error.message.slice(0, 160) : 'unknown',
    });
  }
}

function clearCeiling(): void {
  if (ceilingTimer !== null) {
    clearTimeout(ceilingTimer);
    ceilingTimer = null;
  }
}

export function startAlarmLoop(sound: AlarmSoundId, repeatUntilDismissed: boolean): void {
  stopAlarmLoop();

  try {
    player = createAudioPlayer(SOURCES[sound] ?? SOURCES.classic);
    player.loop = repeatUntilDismissed;
    player.volume = 1;
    try {
      player.setActiveForLockScreen(true, { title: 'Hinto alarm', artist: 'Hinto' });
    } catch {
      // Lock-screen metadata is optional; playback still starts.
    }
    player.play();
  } catch (error) {
    player = null;
    capture('trigger', 'audio_play_failed', {
      message: error instanceof Error ? error.message.slice(0, 160) : 'unknown',
    });
    return;
  }

  // A phone left in a bag must not scream indefinitely (D1).
  ceilingTimer = setTimeout(() => {
    stopAlarmLoop();
    capture('trigger', 'audio_ceiling_reached');
  }, ALARM_LOOP_CEILING_MS);
}

export function stopAlarmLoop(): void {
  clearCeiling();
  if (!player) return;

  try {
    player.pause();
    player.setActiveForLockScreen(false);
  } catch {
    // ignore
  }

  try {
    player.remove();
  } catch {
    // ignore
  }
  player = null;
}

export function isAlarmLooping(): boolean {
  return player?.playing ?? false;
}
