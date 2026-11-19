import { describe, expect, it } from '@jest/globals';

import { parseRelease } from '../release';
import { compareVersions, formatVersion, isNewerVersion, parseVersion } from '../version';

describe('release version maths', () => {
  it('parses plain, prefixed and pre-release tags', () => {
    expect(parseVersion('0.6.6')).toEqual({ major: 0, minor: 6, patch: 6 });
    expect(parseVersion('v1.2.3')).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(parseVersion(' v1.0.0-beta.2 ')).toEqual({ major: 1, minor: 0, patch: 0 });
  });

  it('rejects tags it cannot compare', () => {
    expect(parseVersion('latest')).toBeNull();
    expect(parseVersion('0.6')).toBeNull();
    expect(parseVersion('')).toBeNull();
  });

  it('orders by major, then minor, then patch', () => {
    expect(compareVersions('0.6.5', '0.6.6')).toBeLessThan(0);
    expect(compareVersions('0.7.0', '0.6.9')).toBeGreaterThan(0);
    expect(compareVersions('1.0.0', '0.99.99')).toBeGreaterThan(0);
    expect(compareVersions('v0.6.6', '0.6.6')).toBe(0);
  });

  it('treats an unparsable version as not newer', () => {
    expect(isNewerVersion('0.6.6', '0.6.5')).toBe(true);
    expect(isNewerVersion('0.6.5', '0.6.5')).toBe(false);
    expect(isNewerVersion('0.6.4', '0.6.5')).toBe(false);
    expect(isNewerVersion('nightly', '0.6.5')).toBe(false);
  });

  it('formats a version for display', () => {
    expect(formatVersion('0.6.6')).toBe('v0.6.6');
    expect(formatVersion('v0.6.6')).toBe('v0.6.6');
  });
});

describe('parseRelease', () => {
  const release = {
    tag_name: 'v0.6.6',
    html_url: 'https://github.com/JudeAlmaden/Hinto/releases/tag/v0.6.6',
    published_at: '2026-11-19T08:00:00Z',
    assets: [
      { name: 'notes.txt', browser_download_url: 'https://example.com/notes.txt' },
      {
        name: 'Hinto-v0.6.6.apk',
        browser_download_url: 'https://example.com/Hinto-v0.6.6.apk',
      },
    ],
  };

  it('prefers the APK asset as the download link', () => {
    expect(parseRelease(release)).toEqual({
      version: '0.6.6',
      tagName: 'v0.6.6',
      downloadUrl: 'https://example.com/Hinto-v0.6.6.apk',
      releaseUrl: 'https://github.com/JudeAlmaden/Hinto/releases/tag/v0.6.6',
      publishedAt: '2026-11-19T08:00:00Z',
    });
  });

  it('falls back to the release page when no APK is attached', () => {
    const parsed = parseRelease({ ...release, assets: [] });
    expect(parsed?.downloadUrl).toBe(release.html_url);
  });

  it('normalizes a pre-release tag to its numeric version', () => {
    expect(parseRelease({ ...release, tag_name: 'v1.0.0-rc.1' })?.version).toBe('1.0.0');
  });

  it('rejects payloads without a usable tag or page', () => {
    expect(parseRelease(null)).toBeNull();
    expect(parseRelease({ html_url: release.html_url })).toBeNull();
    expect(parseRelease({ tag_name: 'nightly', html_url: release.html_url })).toBeNull();
    expect(parseRelease({ tag_name: 'v0.6.6' })).toBeNull();
  });
});
