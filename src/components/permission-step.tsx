import { useIsFocused } from 'expo-router';
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
 *
 * The step only ever advances from a press or from the system prompt resolving.
 * The old code also advanced from every foreground event, which pushed the next
 * step twice and left the onboarding stack stuck.
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
  const isFocused = useIsFocused();
  const asking = useRef(false);

  useEffect(() => {
    let active = true;
    void readPermissions()
      .then((permissions) => {
        if (active) setState(permissions[permission]);
      })
      .catch(() => {
        if (active) setState(null);
      });
    return () => {
      active = false;
    };
  }, [permission]);

  // Re-read when the user comes back from Settings; only the visible step
  // reacts, so steps further down the stack cannot navigate on their own.
  useEffect(() => {
    const sub = AppState.addEventListener('change', (nextState) => {
      const returning =
        Boolean(appState.current?.match(/inactive|background/)) && nextState === 'active';
      appState.current = nextState;
      if (!returning || !isFocused) return;

      void readPermissions()
        .then((permissions) => setState(permissions[permission]))
        .catch(() => undefined);
    });
    return () => sub.remove();
  }, [permission, isFocused]);

  const granted = state?.status === 'granted';
  const denied = state?.status === 'denied' && state.canAskAgain === false;

  const allowLabel =
    permission === 'foregroundLocation'
      ? strings.permissions.allowLocation
      : permission === 'backgroundLocation'
        ? strings.permissions.allowBackground
        : strings.permissions.allowNotifications;

  const ask = async () => {
    if (asking.current) return;
    asking.current = true;
    try {
      const next = await requestPermission(permission);
      setState(next);
      if (next.status === 'granted') onContinue();
    } finally {
      asking.current = false;
    }
  };

  const primary = () => {
    if (granted) {
      onContinue();
      return;
    }
    if (denied) {
      void openAppSettings();
      return;
    }
    void ask();
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
      primaryLabel={
        granted
          ? strings.onboarding.continue
          : denied
            ? strings.permissions.openSettings
            : allowLabel
      }
      onPrimary={primary}
      secondaryLabel={granted || denied ? undefined : strings.permissions.notNow}
      onSecondary={granted || denied ? undefined : onContinue}
      skipTo="/onboarding/ready"
    />
  );
}
