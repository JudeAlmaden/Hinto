import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import {
  checkForUpdate,
  dismissRelease,
  openRelease,
  type ReleaseInfo,
  type UpdateCheckResult,
} from '@/modules/updates';

export interface UpdateCheckState {
  /** A newer release to announce, or null when there is nothing to say. */
  release: ReleaseInfo | null;
  /** True while a check the user asked for is running. */
  checking: boolean;
  checkNow: () => Promise<UpdateCheckResult>;
  dismiss: () => Promise<void>;
  open: () => void;
}

/**
 * Runs the release check once per app foreground. The alarm app is opened right
 * before a trip, so that is exactly when a new version is worth mentioning —
 * and when the phone is likely online.
 */
export function useUpdateCheck(enabled = true): UpdateCheckState {
  const [release, setRelease] = useState<ReleaseInfo | null>(null);
  const [checking, setChecking] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // `checkForUpdate` shares one in-flight request across screens, so an
  // overlapping mount and foreground transition cost a single GitHub call.
  const run = useCallback(
    (): Promise<UpdateCheckResult> =>
      checkForUpdate()
        .catch((): UpdateCheckResult => ({ release: null, ok: false }))
        .then((result) => {
          if (mounted.current) setRelease(result.release);
          return result;
        }),
    [],
  );

  useEffect(() => {
    if (Platform.OS === 'web' || !enabled) return;

    void run();
    const subscription = AppState.addEventListener('change', (next) => {
      if (next === 'active') void run();
    });
    return () => subscription.remove();
  }, [enabled, run]);

  const checkNow = useCallback(async () => {
    setChecking(true);
    try {
      return await run();
    } finally {
      if (mounted.current) setChecking(false);
    }
  }, [run]);

  const dismiss = useCallback(async () => {
    if (!release) return;
    const version = release.version;
    setRelease(null);
    await dismissRelease(version).catch(() => undefined);
  }, [release]);

  const open = useCallback(() => {
    if (release) void openRelease(release);
  }, [release]);

  return { release, checking, checkNow, dismiss, open };
}
