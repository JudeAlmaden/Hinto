import { useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';

import { OnboardingShell } from '@/components/onboarding-shell';
import { Mascot } from '@/components/ui/mascot';
import { strings } from '@/constants/strings';
import type { PermissionKey, PermissionState } from '@/modules/permissions';
import {
  openAppSettings,
  readPermissions,
  requestPermission,
} from '@/modules/permissions/service';

/**
 * Education before the system prompt, and a denial path that never loops the
 * prompt (spec §6, plan Phase 9).
 */
export function PermissionStep({
  permission,
  step,
  title,
  body,
  note,
  deniedTitle,
  deniedBody,
  onContinue,
}: {
  permission: PermissionKey;
  step: number;
  title: string;
  body: string;
  note?: string;
  deniedTitle: string;
  deniedBody: string;
  onContinue: () => void;
}) {
  const [state, setState] = useState<PermissionState | null>(null);
  const appState = useRef(AppState.currentState);

  const refresh = () => {
    void readPermissions()
      .then((permissions) => {
        const next = permissions[permission];
        setState(next);
        // Auto-advance if user granted the permission in Settings
        if (next.status === 'granted') onContinue();
      })
      .catch(() => setState(null));
  };

  // Initial read
  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission]);

  // Re-read when app returns to foreground (user came back from Settings)
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      if (appState.current?.match(/inactive|background/) && nextState === 'active') {
        refresh();
      }
      appState.current = nextState;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [permission]);

  const denied = state?.status === 'denied';

  const allowLabel =
    permission === 'foregroundLocation'
      ? strings.permissions.allowLocation
      : permission === 'backgroundLocation'
        ? strings.permissions.allowBackground
        : strings.permissions.allowNotifications;

  const ask = async () => {
    const next = await requestPermission(permission);
    setState(next);
    if (next.status === 'granted') onContinue();
  };

  const heroMascot = denied ? (
    <Mascot expression="worried" height={110} />
  ) : permission === 'foregroundLocation' ? (
    <Mascot pose="navigator" height={130} />
  ) : permission === 'backgroundLocation' ? (
    <Mascot pose="onTheGo" height={130} />
  ) : (
    <Mascot pose="alert" height={130} />
  );

  return (
    <OnboardingShell
      step={step}
      hero={heroMascot}
      title={denied ? deniedTitle : title}
      body={denied ? deniedBody : body}
      note={denied ? strings.permissions.fixInSettings : note}
      primaryLabel={denied ? strings.permissions.openSettings : allowLabel}
      onPrimary={() => {
        if (denied) void openAppSettings();
        else void ask();
      }}
      secondaryLabel={denied ? strings.permissions.skipForNow : strings.permissions.notNow}
      onSecondary={onContinue}
      skipTo="/onboarding/ready"
    />
  );
}
