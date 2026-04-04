import React from 'react';
import {
  Info, AlertTriangle, XCircle, ShieldAlert, ShieldCheck, ShieldOff, Eye,
  Key, Lock, Settings, Camera, User,
} from 'lucide-react';

export type LogLevel = 'info' | 'warning' | 'error' | 'critical';
export type LogCategory = 'auth' | 'access' | 'system' | 'camera' | 'alert' | 'config' | 'user';
export type AccessStatus = 'granted' | 'denied' | 'pending';
export type ListType = 'whitelist' | 'blacklist' | 'watchlist';

export interface AuditLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  action: string;
  description: string;
  userId?: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
}

export interface AccessEvent {
  id: string;
  timestamp: string;
  personId: string;
  personName: string;
  personPhoto?: string;
  status: AccessStatus;
  location?: string;
  cameraId?: string;
  cameraName?: string;
  confidence?: number;
  reason?: string;
}

export interface SecurityPerson {
  id: string;
  name: string;
  photo?: string;
  listType: ListType;
  reason?: string;
  addedAt: string;
  addedBy?: string;
  expiresAt?: string;
}

export interface SecurityStats {
  totalLogs: number;
  errorCount: number;
  warningCount: number;
  accessGranted: number;
  accessDenied: number;
  blacklistCount: number;
  whitelistCount: number;
}

export const logLevelConfig: Record<LogLevel, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  info: { icon: Info, color: 'text-blue-500', bgColor: 'bg-blue-500/10', label: 'Info' },
  warning: { icon: AlertTriangle, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', label: 'Aviso' },
  error: { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-500/10', label: 'Erro' },
  critical: { icon: ShieldAlert, color: 'text-red-600', bgColor: 'bg-red-600/10', label: 'Crítico' },
};

export const categoryConfig: Record<LogCategory, { icon: React.ElementType; label: string }> = {
  auth: { icon: Key, label: 'Autenticação' },
  access: { icon: Lock, label: 'Acesso' },
  system: { icon: Settings, label: 'Sistema' },
  camera: { icon: Camera, label: 'Câmera' },
  alert: { icon: AlertTriangle, label: 'Alerta' },
  config: { icon: Settings, label: 'Configuração' },
  user: { icon: User, label: 'Usuário' },
};

export const listTypeConfig: Record<ListType, { icon: React.ElementType; color: string; bgColor: string; label: string }> = {
  whitelist: { icon: ShieldCheck, color: 'text-green-500', bgColor: 'bg-green-500/10', label: 'Liberado' },
  blacklist: { icon: ShieldOff, color: 'text-red-500', bgColor: 'bg-red-500/10', label: 'Bloqueado' },
  watchlist: { icon: Eye, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10', label: 'Monitorado' },
};
