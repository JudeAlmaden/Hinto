/**
 * Release version maths.
 *
 * Hinto ships as an APK attached to a GitHub Release, so the only comparison
 * that matters is a release tag (`v0.6.6`) against the version baked into this
 * build (`Constants.expoConfig.version`). Anything unparsable is never newer:
 * a malformed tag must not nag users forever.
 */

export interface Version {
  major: number;
  minor: number;
  patch: number;
}

/** `v0.6.6`, `0.6.6` and `1.0.0-beta.2` parse; `latest` and `0.6` do not. */
export function parseVersion(raw: string): Version | null {
  const match = /^v?(\d+)\.(\d+)\.(\d+)(?:[-+][0-9A-Za-z.-]+)?$/i.exec(raw.trim());
  if (!match) return null;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

/** Negative when `a` is older, positive when newer, 0 when equal or unknown. */
export function compareVersions(a: string, b: string): number {
  const left = parseVersion(a);
  const right = parseVersion(b);
  if (!left || !right) return 0;
  return left.major - right.major || left.minor - right.minor || left.patch - right.patch;
}

export function isNewerVersion(candidate: string, current: string): boolean {
  return compareVersions(candidate, current) > 0;
}

/** `0.6.6` → `v0.6.6` for display. */
export function formatVersion(version: string): string {
  return `v${version.replace(/^v/i, '')}`;
}
