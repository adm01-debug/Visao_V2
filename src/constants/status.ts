export const CAMERA_STATUS = { ONLINE: 'online', OFFLINE: 'offline', ERROR: 'error', CONNECTING: 'connecting', RECORDING: 'recording' } as const;
export const ALERT_STATUS = { ACTIVE: 'active', ACKNOWLEDGED: 'acknowledged', RESOLVED: 'resolved', EXPIRED: 'expired' } as const;
export const RECORDING_STATUS = { RECORDING: 'recording', COMPLETED: 'completed', PROCESSING: 'processing', FAILED: 'failed' } as const;
export const USER_STATUS = { ACTIVE: 'active', INACTIVE: 'inactive', PENDING: 'pending', BLOCKED: 'blocked' } as const;

export const STATUS_COLORS = {
  online: 'green', offline: 'gray', error: 'red', connecting: 'yellow', recording: 'blue',
  active: 'red', acknowledged: 'yellow', resolved: 'green', expired: 'gray',
  completed: 'green', processing: 'blue', failed: 'red',
  inactive: 'gray', pending: 'yellow', blocked: 'red',
};

export const STATUS_LABELS = {
  online: 'Online', offline: 'Offline', error: 'Erro', connecting: 'Conectando', recording: 'Gravando',
  active: 'Ativo', acknowledged: 'Reconhecido', resolved: 'Resolvido', expired: 'Expirado',
  completed: 'Concluído', processing: 'Processando', failed: 'Falhou',
  inactive: 'Inativo', pending: 'Pendente', blocked: 'Bloqueado',
};
