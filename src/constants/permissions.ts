export const PERMISSIONS = {
  CAMERAS: { VIEW: 'cameras:view', CREATE: 'cameras:create', EDIT: 'cameras:edit', DELETE: 'cameras:delete', CONTROL: 'cameras:control' },
  ALERTS: { VIEW: 'alerts:view', CREATE: 'alerts:create', ACKNOWLEDGE: 'alerts:acknowledge', DELETE: 'alerts:delete' },
  RECORDINGS: { VIEW: 'recordings:view', DOWNLOAD: 'recordings:download', DELETE: 'recordings:delete' },
  USERS: { VIEW: 'users:view', CREATE: 'users:create', EDIT: 'users:edit', DELETE: 'users:delete' },
  SETTINGS: { VIEW: 'settings:view', EDIT: 'settings:edit' },
  REPORTS: { VIEW: 'reports:view', CREATE: 'reports:create', EXPORT: 'reports:export' },
} as const;

export const PERMISSION_GROUPS = {
  ADMIN: Object.values(PERMISSIONS).flatMap(Object.values),
  MANAGER: [PERMISSIONS.CAMERAS.VIEW, PERMISSIONS.CAMERAS.EDIT, PERMISSIONS.ALERTS.VIEW, PERMISSIONS.ALERTS.ACKNOWLEDGE, PERMISSIONS.RECORDINGS.VIEW, PERMISSIONS.REPORTS.VIEW, PERMISSIONS.REPORTS.CREATE],
  OPERATOR: [PERMISSIONS.CAMERAS.VIEW, PERMISSIONS.CAMERAS.CONTROL, PERMISSIONS.ALERTS.VIEW, PERMISSIONS.ALERTS.ACKNOWLEDGE, PERMISSIONS.RECORDINGS.VIEW],
  VIEWER: [PERMISSIONS.CAMERAS.VIEW, PERMISSIONS.ALERTS.VIEW, PERMISSIONS.RECORDINGS.VIEW],
};

export default PERMISSIONS;
