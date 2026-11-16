/**
 * Permissions, location services and Settings deep links (spec §6, plan
 * Phase 5/9).
 *
 * The app never loops a system prompt: a permanent denial is explained and
 * routed to Android Settings instead.
 */

import * as Battery from 'expo-battery';
import * as IntentLauncher from 'expo-intent-launcher';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';

import { strings } from '@/constants/strings';
import { capture } from '@/modules/diagnostics';

import type { PermissionKey, PermissionMap, PermissionState, ReadinessIssue } from '.';

function mapLocationStatus(
  status: Location.PermissionStatus,
  canAskAgain: boolean,
): PermissionState {
  if (status === Location.PermissionStatus.GRANTED) {
    return { status: 'granted', canAskAgain: true };
  }
  if (status === Location.PermissionStatus.DENIED && !canAskAgain) {
    return { status: 'denied', canAskAgain: false };
  }
  if (status === Location.PermissionStatus.DENIED) {
    return { status: 'denied', canAskAgain: true };
  }
  return { status: 'undetermined', canAskAgain: true };
}

function mapNotificationStatus(status: Notifications.PermissionStatus, canAskAgain: boolean): PermissionState {
  if (status === 'granted') return { status: 'granted', canAskAgain: true };
  if (status === 'denied') return { status: 'denied', canAskAgain };
  return { status: 'undetermined', canAskAgain: true };
}

export async function readPermissions(): Promise<PermissionMap> {
  const foreground = await Location.getForegroundPermissionsAsync();
  const background = await Location.getBackgroundPermissionsAsync();
  const notifications = await Notifications.getPermissionsAsync();

  return {
    foregroundLocation: mapLocationStatus(foreground.status, foreground.canAskAgain),
    backgroundLocation: mapLocationStatus(background.status, background.canAskAgain),
    notifications: mapNotificationStatus(notifications.status, notifications.canAskAgain),
  };
}

export async function requestPermission(key: PermissionKey): Promise<PermissionState> {
  try {
    if (key === 'foregroundLocation') {
      const response = await Location.requestForegroundPermissionsAsync();
      return mapLocationStatus(response.status, response.canAskAgain);
    }
    if (key === 'backgroundLocation') {
      const response = await Location.requestBackgroundPermissionsAsync();
      return mapLocationStatus(response.status, response.canAskAgain);
    }
    const response = await Notifications.requestPermissionsAsync();
    return mapNotificationStatus(response.status, response.canAskAgain);
  } catch (error) {
    capture('permission', 'permission_request_failed', {
      permission: key,
      message: error instanceof Error ? error.message.slice(0, 120) : 'unknown',
    });
    return { status: 'denied', canAskAgain: true };
  }
}

export async function areLocationServicesEnabled(): Promise<boolean> {
  try {
    return await Location.hasServicesEnabledAsync();
  } catch {
    return false;
  }
}

export interface ProviderStatus {
  servicesEnabled: boolean;
  gpsAvailable: boolean | null;
  networkAvailable: boolean | null;
  backgroundModeEnabled: boolean | null;
}

export async function readProviderStatus(): Promise<ProviderStatus> {
  try {
    const status = await Location.getProviderStatusAsync();
    return {
      servicesEnabled: status.locationServicesEnabled,
      gpsAvailable: status.gpsAvailable ?? null,
      networkAvailable: status.networkAvailable ?? null,
      backgroundModeEnabled: status.backgroundModeEnabled ?? null,
    };
  } catch {
    return {
      servicesEnabled: false,
      gpsAvailable: null,
      networkAvailable: null,
      backgroundModeEnabled: null,
    };
  }
}

/**
 * Home's readiness strip and the journey-start gate (spec §12).
 * `blocking` prevents a journey; `warning` only qualifies it.
 */
export async function getReadinessIssues(): Promise<ReadinessIssue[]> {
  const [permissions, servicesEnabled] = await Promise.all([
    readPermissions(),
    areLocationServicesEnabled(),
  ]);
  const issues: ReadinessIssue[] = [];

  if (!servicesEnabled) {
    issues.push({
      key: 'locationServices',
      severity: 'blocking',
      message: strings.readiness.servicesOff,
    });
  }

  if (permissions.foregroundLocation.status !== 'granted') {
    issues.push({
      key: 'foregroundLocation',
      severity: 'blocking',
      message: strings.readiness.locationDenied,
    });
  }

  if (permissions.backgroundLocation.status !== 'granted') {
    issues.push({
      key: 'backgroundLocation',
      severity: 'blocking',
      message: strings.readiness.backgroundDenied,
    });
  }

  if (permissions.notifications.status !== 'granted') {
    issues.push({
      key: 'notifications',
      severity: 'warning',
      message: strings.readiness.notificationsDenied,
    });
  }

  return issues;
}

export async function openAppSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    // Nothing else to offer; the caller's copy already says Settings.
  }
}

export async function openLocationSettings(): Promise<void> {
  if (Platform.OS !== 'android') {
    await openAppSettings();
    return;
  }
  try {
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.LOCATION_SOURCE_SETTINGS,
    );
  } catch {
    await openAppSettings();
  }
}

export async function openBatterySettings(): Promise<void> {
  if (Platform.OS !== 'android') {
    await openAppSettings();
    return;
  }
  try {
    // Direct system dialog: "Allow Hinto to always run in background? [Allow] [Deny]"
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
      { data: 'package:com.hinto.app' },
    );
  } catch {
    try {
      // Direct App Info page for Hinto where Battery settings are immediately visible
      await IntentLauncher.startActivityAsync(
        IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
        { data: 'package:com.hinto.app' },
      );
    } catch {
      try {
        await IntentLauncher.startActivityAsync(
          IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS,
        );
      } catch {
        await openAppSettings();
      }
    }
  }
}

export async function isBatteryOptimisationOn(): Promise<boolean> {
  try {
    return await Battery.isBatteryOptimizationEnabledAsync();
  } catch {
    return false;
  }
}

/**
 * Opens the OEM-specific "Auto-Start" / "Startup Manager" settings page so the
 * user can allow Hinto to run after the screen locks.  Different manufacturers
 * use completely different activity names; we try them in order and fall back to
 * the app's own detail page so the user can at least navigate from there.
 *
 * Tested component names (non-exhaustive):
 *  - OPPO / OnePlus ColorOS: com.coloros.safecenter / .permission.startupapp.StartupAppListActivity
 *  - Xiaomi MIUI: com.miui.securitycenter / .AppCenterActivity
 *  - Samsung One UI: com.samsung.android.lool / .HibernationActivity
 *  - Huawei EMUI: com.huawei.systemmanager / .startupmgr.ui.StartupNormalAppListActivity
 *  - Vivo: com.iqoo.secure / .ui.phoneoptimize.AddWhiteListActivity
 */
export async function openAutoStartSettings(): Promise<void> {
  if (Platform.OS !== 'android') return;

  const oemActivities = [
    // OPPO / ColorOS (most common for user's device)
    {
      packageName: 'com.coloros.safecenter',
      className: 'com.coloros.safecenter.permission.startupapp.StartupAppListActivity',
    },
    {
      packageName: 'com.coloros.safecenter',
      className: 'com.coloros.safecenter.startupapp.StartupAppListActivity',
    },
    // OnePlus (older OxygenOS)
    {
      packageName: 'com.oneplus.security',
      className: 'com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity',
    },
    // Xiaomi / MIUI
    {
      packageName: 'com.miui.securitycenter',
      className: 'com.miui.permcenter.autostart.AutoStartManagementActivity',
    },
    // Samsung One UI
    {
      packageName: 'com.samsung.android.lool',
      className: 'com.samsung.android.sm.battery.ui.BatteryActivity',
    },
    // Huawei / EMUI
    {
      packageName: 'com.huawei.systemmanager',
      className: 'com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity',
    },
    // Vivo
    {
      packageName: 'com.iqoo.secure',
      className: 'com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity',
    },
    // Realme / Narzo (ColorOS variant)
    {
      packageName: 'com.coloros.oppoguardelf',
      className: 'com.coloros.powermanager.fuelgaue.PowerConsumptionActivity',
    },
  ];

  for (const { packageName, className } of oemActivities) {
    try {
      await IntentLauncher.startActivityAsync(className, {
        packageName,
      });
      return; // success — stop trying
    } catch {
      // try next
    }
  }

  // Generic fallback: open Hinto's App Details so user can tap Battery / Autostart
  try {
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
      { data: 'package:com.hinto.app' },
    );
  } catch {
    await openAppSettings();
  }
}
