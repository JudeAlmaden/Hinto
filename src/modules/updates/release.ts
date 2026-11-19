/**
 * GitHub Releases feed — the only place a Hinto build is published.
 *
 * Reads the public `releases/latest` endpoint (no token: the repository and its
 * releases are public) and turns it into the one shape the app needs. Every
 * failure — offline, rate limited, malformed payload — is a null release, so a
 * commute never depends on GitHub being reachable.
 */

import { capture } from '@/modules/diagnostics';

import { parseVersion } from './version';

export const UPDATE_REPOSITORY = 'JudeAlmaden/Hinto';
export const LATEST_RELEASE_URL = `https://api.github.com/repos/${UPDATE_REPOSITORY}/releases/latest`;

const REQUEST_TIMEOUT_MS = 8_000;

export interface ReleaseInfo {
  /** Numeric tag (`0.6.6`), so it can be compared and displayed directly. */
  version: string;
  tagName: string;
  /** The APK asset when the release carries one, otherwise the release page. */
  downloadUrl: string;
  releaseUrl: string;
  publishedAt: string | null;
}

interface ReleaseAsset {
  name?: unknown;
  browser_download_url?: unknown;
}

interface ReleasePayload {
  tag_name?: unknown;
  html_url?: unknown;
  published_at?: unknown;
  assets?: unknown;
}

function apkUrl(assets: ReleaseAsset[]): string | null {
  const apk = assets.find(
    (asset) =>
      typeof asset.name === 'string' &&
      asset.name.toLowerCase().endsWith('.apk') &&
      typeof asset.browser_download_url === 'string',
  );
  return apk && typeof apk.browser_download_url === 'string' ? apk.browser_download_url : null;
}

/** Maps a GitHub release payload; null when it carries no usable version. */
export function parseRelease(payload: unknown): ReleaseInfo | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as ReleasePayload;

  const tagName = typeof data.tag_name === 'string' ? data.tag_name : null;
  const releaseUrl = typeof data.html_url === 'string' ? data.html_url : null;
  if (!tagName || !releaseUrl) return null;

  const parsed = parseVersion(tagName);
  if (!parsed) return null;

  const assets = Array.isArray(data.assets) ? (data.assets as ReleaseAsset[]) : [];

  return {
    version: `${parsed.major}.${parsed.minor}.${parsed.patch}`,
    tagName,
    downloadUrl: apkUrl(assets) ?? releaseUrl,
    releaseUrl,
    publishedAt: typeof data.published_at === 'string' ? data.published_at : null,
  };
}

export async function fetchLatestRelease(): Promise<ReleaseInfo | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(LATEST_RELEASE_URL, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    });

    if (!response.ok) {
      capture('update', 'update_check_failed', { status: response.status });
      return null;
    }

    return parseRelease(await response.json());
  } catch (error) {
    capture('update', 'update_check_failed', {
      message: error instanceof Error ? error.message.slice(0, 160) : 'unknown',
    });
    return null;
  } finally {
    clearTimeout(timer);
  }
}
