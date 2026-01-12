/**
 * Alert Utilities
 * @module lib/alertUtils
 */

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertType = 'motion' | 'intrusion' | 'face' | 'object' | 'system' | 'connection';

export interface AlertConfig {
  type: AlertType;
  severity: AlertSeverity;
  sound?: boolean;
  notification?: boolean;
  email?: boolean;
}

export function getSeverityColor(severity: AlertSeverity): string {
  const colors: Record<AlertSeverity, string> = {
    low: '#22c55e',
    medium: '#f59e0b',
    high: '#ef4444',
    critical: '#dc2626'
  };
  return colors[severity];
}

export function getSeverityLabel(severity: AlertSeverity): string {
  const labels: Record<AlertSeverity, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica'
  };
  return labels[severity];
}

export function getAlertTypeLabel(type: AlertType): string {
  const labels: Record<AlertType, string> = {
    motion: 'Movimento',
    intrusion: 'Intrusão',
    face: 'Reconhecimento Facial',
    object: 'Objeto Detectado',
    system: 'Sistema',
    connection: 'Conexão'
  };
  return labels[type];
}

export function shouldPlaySound(severity: AlertSeverity): boolean {
  return severity === 'high' || severity === 'critical';
}

export function formatAlertMessage(type: AlertType, source: string, details?: string): string {
  const typeLabel = getAlertTypeLabel(type);
  let msg = `${typeLabel} detectado em ${source}`;
  if (details) msg += `: ${details}`;
  return msg;
}

export default { getSeverityColor, getSeverityLabel, getAlertTypeLabel, shouldPlaySound, formatAlertMessage };
