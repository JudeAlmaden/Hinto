/**
 * App updates — "a newer Hinto exists" without a store or a push server.
 *
 * Builds are sideloaded from GitHub Releases, so the app asks the public
 * releases API whenever it comes to the foreground online. A newer, undismissed
 * tag surfaces as a Home card, a Settings row and one notification per version.
 * Checks are deliberately unthrottled (one request per foreground, no polling):
 * a personal release cadence cannot approach GitHub's 60/hour anonymous limit,
 * and no cached state can get stale.
 */

import Constants from 'expo-constants';
import { Linking } from 'react-native';

import { getDatabase } from '@/db/client';
import { capture } from '@/modules/diagnostics';
import { getSettings, setSettings } from '@/modules/settings/repository';

import { postUpdateNotification } from './notifications';
import { fetchLatestRelease, type ReleaseInfo } from './release';
import { isNewerVersion } from './version';

export { LATEST_RELEASE_URL, UPDATE_REPOSITORY, fetchLatestRelease, parseRelease } from './release';
export type { ReleaseInfo } from './release';
export { compareVersions, formatVersion, isNewerVersion, parseVersion } from './version';

export interface UpdateCheckResult {
  /** A newer release the user has not dismissed; null when up to date. */
  release: ReleaseInfo | null;
  /** False when GitHub could not be reached, so a manual check can say so. */
  ok: boolean;
}

/** The version baked into this build — the same string Settings displays. */
export function currentVersion(): string {
  return Constants.expoConfig?.version ?? '0.0.0';
}

let inFlight: Promise<UpdateCheckResult> | null = null;

/**
 * Fetches the latest release and returns it when it is newer than this build
 * and not dismissed. Posts the one-per-version notification as a side effect.
 * Screens that mount together (Home and Settings) share one request.
 */
export function checkForUpdate(): Promise<UpdateCheckResult> {
  if (!inFlight) {
    inFlight = runCheck().finally(() => {
      inFlight = null;
    });
  }
  return inFlight;
}

async function runCheck(): Promise<UpdateCheckResult> {
  const latest = await fetchLatestRelease();
  if (!latest) return { release: null, ok: false };

  if (!isNewerVersion(latest.version, currentVersion())) return { release: null, ok: true };

  const db = await getDatabase();
  const state = (await getSettings(db)).update_check;
  if (latest.version === state.dismissed_version) return { release: null, ok: true };

  if (latest.version !== state.notified_version) {
    const delivered = await postUpdateNotification(latest);
    if (delivered) {
      await setSettings(db, {
        update_check: { ...state, notified_version: latest.version },
      });
    }
  }

  return { release: latest, ok: true };
}

/** "Not now": hides the card for this release; a later tag shows again. */
export async function dismissRelease(version: string): Promise<void> {
  const db = await getDatabase();
  const state = (await getSettings(db)).update_check;
  await setSettings(db, {
    update_check: { ...state, dismissed_version: version },
  });
}

/** Hands the APK (or release page) to the browser, where Android downloads it. */
export async function openRelease(release: ReleaseInfo): Promise<void> {
  try {
    await Linking.openURL(release.downloadUrl);
  } catch (error) {
    capture('update', 'update_open_failed', {
      message: error instanceof Error ? error.message.slice(0, 160) : 'unknown',
    });
  }
}
