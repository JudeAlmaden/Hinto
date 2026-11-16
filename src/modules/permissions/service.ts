/**
 * Permissions, location services and Settings deep links (spec §6, plan
 * Phase 5/9).
 *
 * The app never loops a system prompt: a permanent denial is explained and
 * routed to Android Settings instead.
 */

import * as Battery from 'expo-battery';
import * as Device from 'expo-device';
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

/** Where a Settings button landed, so the caller can confirm what it opened. */
export type SettingsDestination = 'oem' | 'dialog' | 'appInfo';

export async function openBatterySettings(): Promise<SettingsDestination> {
  if (Platform.OS !== 'android') {
    await openAppSettings();
    return 'appInfo';
  }

  const brand = (Device.manufacturer ?? '').toLowerCase();
  const isAggressiveOEM =
    brand.includes('oppo') ||
    brand.includes('realme') ||
    brand.includes('oneplus') ||
    brand.includes('xiaomi') ||
    brand.includes('redmi') ||
    brand.includes('poco') ||
    brand.includes('vivo') ||
    brand.includes('huawei');

  // Aggressive OEM skins (ColorOS, MIUI, EMUI, Funtouch) suppress the standard
  // system dialog, so opening Hinto's App Info page directly gives the user the
  // real "Battery usage" / "Background launch" toggles.
  if (isAggressiveOEM) {
    try {
      await openAppSettingsPage();
      return 'appInfo';
    } catch {
      await openAppSettings();
      return 'appInfo';
    }
  }

  try {
    // Direct system dialog: "Allow Hinto to always run in background? [Allow] [Deny]"
    await IntentLauncher.startActivityAsync(
      IntentLauncher.ActivityAction.REQUEST_IGNORE_BATTERY_OPTIMIZATIONS,
      { data: `package:${APP_PACKAGE}` },
    );
    return 'dialog';
  } catch {
    try {
      await openAppSettingsPage();
      return 'appInfo';
    } catch {
      await openAppSettings();
      return 'appInfo';
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

const APP_PACKAGE = 'com.hinto.app';

interface AutoStartTarget {
  packageName: string;
  className: string;
}

/**
 * Each Android skin puts "Auto-start" somewhere else, so the activity is
 * selected by manufacturer instead of blindly probing every OEM package.
 * A wrong entry is harmless (the component is missing and we try the next one),
 * but probing all of them made the button feel broken on non-Oppo phones.
 */
const AUTO_START_BRANDS: { brands: string[]; targets: AutoStartTarget[] }[] = [
  {
    // ColorOS / OxygenOS / realme UI all descend from the same settings app.
    brands: ['oppo', 'realme', 'oneplus'],
    targets: [
      {
        packageName: 'com.oplus.safecenter',
        className: 'com.oplus.safecenter.permission.startup.StartupAppListActivity',
      },
      {
        packageName: 'com.coloros.safecenter',
        className: 'com.coloros.safecenter.permission.startup.StartupAppListActivity',
      },
      {
        packageName: 'com.coloros.safecenter',
        className: 'com.coloros.safecenter.startupapp.StartupAppListActivity',
      },
      {
        packageName: 'com.oneplus.security',
        className: 'com.oneplus.security.chainlaunch.view.ChainLaunchAppListActivity',
      },
    ],
  },
  {
    brands: ['xiaomi', 'redmi', 'poco'],
    targets: [
      {
        packageName: 'com.miui.securitycenter',
        className: 'com.miui.permcenter.autostart.AutoStartManagementActivity',
      },
    ],
  },
  {
    brands: ['samsung'],
    targets: [
      {
        packageName: 'com.samsung.android.lool',
        className: 'com.samsung.android.sm.ui.battery.BatteryActivity',
      },
    ],
  },
  {
    brands: ['huawei', 'honor'],
    targets: [
      {
        packageName: 'com.huawei.systemmanager',
        className: 'com.huawei.systemmanager.startupmgr.ui.StartupNormalAppListActivity',
      },
    ],
  },
  {
    brands: ['vivo', 'iqoo'],
    targets: [
      {
        packageName: 'com.vivo.permissionmanager',
        className: 'com.vivo.permissionmanager.activity.BgStartUpManagerActivity',
      },
      {
        packageName: 'com.iqoo.secure',
        className: 'com.iqoo.secure.ui.phoneoptimize.AddWhiteListActivity',
      },
    ],
  },
  {
    brands: ['asus'],
    targets: [
      {
        packageName: 'com.asus.mobilemanager',
        className: 'com.asus.mobilemanager.autostart.AutoStartActivity',
      },
    ],
  },
];

function autoStartTargets(manufacturer: string | null): AutoStartTarget[] {
  const brand = (manufacturer ?? '').toLowerCase().replace(/[^a-z]/g, '');
  if (!brand) return [];
  return AUTO_START_BRANDS.find((entry) => entry.brands.includes(brand))?.targets ?? [];
}

/** True when this phone's skin has a page Hinto can open directly. */
export function hasAutoStartShortcut(): boolean {
  return autoStartTargets(Device.manufacturer).length > 0;
}

async function openAppSettingsPage(): Promise<void> {
  await IntentLauncher.startActivityAsync(
    IntentLauncher.ActivityAction.APPLICATION_DETAILS_SETTINGS,
    { data: `package:${APP_PACKAGE}` },
  );
}

/**
 * Opens the OEM "Auto-Start" / "Startup Manager" page so Hinto survives the
 * screen locking. Note that `className` belongs in the params: passing it as the
 * intent action (the previous behaviour) never matched an activity, which is why
 * the button only ever fell through to the app page.
 *
 * Resolves after the user comes back, with where they were sent.
 */
export async function openAutoStartSettings(): Promise<SettingsDestination> {
  if (Platform.OS !== 'android') {
    await openAppSettings();
    return 'appInfo';
  }

  // Opens Hinto's App Info page, which provides direct access to Battery Usage,
  // Background Activity, and Auto-Launch toggles across all OEM skins.
  try {
    await openAppSettingsPage();
  } catch {
    await openAppSettings();
  }
  return 'appInfo';
}
