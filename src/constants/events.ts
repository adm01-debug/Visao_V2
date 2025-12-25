export const EVENTS = {
  CAMERA: { CONNECTED: 'camera:connected', DISCONNECTED: 'camera:disconnected', ERROR: 'camera:error', SNAPSHOT: 'camera:snapshot' },
  ALERT: { NEW: 'alert:new', UPDATED: 'alert:updated', ACKNOWLEDGED: 'alert:acknowledged', DELETED: 'alert:deleted' },
  RECORDING: { STARTED: 'recording:started', STOPPED: 'recording:stopped', COMPLETED: 'recording:completed' },
  AUTH: { LOGIN: 'auth:login', LOGOUT: 'auth:logout', SESSION_EXPIRED: 'auth:session_expired' },
  SYSTEM: { ONLINE: 'system:online', OFFLINE: 'system:offline', ERROR: 'system:error' },
  UI: { MODAL_OPEN: 'ui:modal_open', MODAL_CLOSE: 'ui:modal_close', SIDEBAR_TOGGLE: 'ui:sidebar_toggle' },
};

export default EVENTS;
