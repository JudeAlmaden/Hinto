/**
 * Custom alarm sounds (Settings → Alarm sound).
 *
 * The system picker returns a temporary copy, so the file is copied into the
 * app's document directory: it survives cache cleanup and the original audio
 * file being deleted from the phone.
 */

import { Directory, File, Paths } from 'expo-file-system';

import { capture } from '@/modules/diagnostics';

const FOLDER = 'alarm-sounds';

/** Opens the system audio picker. Returns null when the user cancels. */
export async function pickCustomAlarmSound(): Promise<string | null> {
  const result = await File.pickFileAsync({ mimeTypes: 'audio/*' });
  if (result.canceled) return null;

  const picked = result.result;
  const directory = new Directory(Paths.document, FOLDER);
  if (!directory.exists) {
    directory.create({ intermediates: true });
  }

  const extension = picked.extension || '.m4a';
  const destination = new File(directory, `alarm-${Date.now()}${extension}`);
  await picked.copy(destination);

  return destination.uri;
}

/** File name shown in Settings; falls back to null when the URI is unusable. */
export function customSoundFileName(uri: string | null): string | null {
  if (!uri) return null;
  const last = uri.split('/').filter(Boolean).pop();
  if (!last) return null;
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
}

export function deleteCustomAlarmSound(uri: string | null): void {
  if (!uri) return;
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (error) {
    capture('trigger', 'custom_sound_delete_failed', {
      message: error instanceof Error ? error.message.slice(0, 160) : 'unknown',
    });
  }
}
