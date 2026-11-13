/**
 * Permissions — normalized state and settings deep links (spec §6, plan Phase 5/9).
 */

export type PermissionKey = 'foregroundLocation' | 'backgroundLocation' | 'notifications';

export interface PermissionState {
  status: 'granted' | 'denied' | 'undetermined';
  /** False after a permanent denial: only Settings can help. */
  canAskAgain: boolean;
}

export type PermissionMap = Record<PermissionKey, PermissionState>;

export interface ReadinessIssue {
  key: PermissionKey | 'locationServices' | 'batteryGuidance' | 'alarmTest';
  severity: 'blocking' | 'warning';
  message: string;
}
