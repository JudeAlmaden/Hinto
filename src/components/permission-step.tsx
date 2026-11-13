import { useEffect, useState } from 'react';

import { OnboardingShell } from '@/components/onboarding-shell';
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

  useEffect(() => {
    void readPermissions()
      .then((permissions) => setState(permissions[permission]))
      .catch(() => setState(null));
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

  return (
    <OnboardingShell
      step={step}
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
    />
  );
}
