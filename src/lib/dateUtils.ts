// Date utility functions

/**
 * `new Date('YYYY-MM-DD')` é interpretado como meia-noite **UTC** pela spec.
 * Ao formatar em fuso negativo (America/Sao_Paulo = UTC-3) isso exibe o dia
 * anterior. Colunas `date` do Postgres chegam exatamente nesse formato, então
 * datas sem hora precisam ser lidas como dia civil **local**.
 */
const parseDateInput = (date: string | Date): Date => {
  if (date instanceof Date) return date;
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (dateOnly) {
    return new Date(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3]));
  }
  return new Date(date);
};

export const formatDate = (date: string | Date, _format?: string): string => {
  const d = parseDateInput(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('pt-BR');
};

export const formatDateTime = (date: string | Date): string => {
  const d = parseDateInput(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString('pt-BR');
};

export const formatTime = (date: string | Date): string => {
  const d = parseDateInput(date);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('pt-BR');
};

export const formatRelativeTime = (date: string | Date): string => {
  const d = parseDateInput(date);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'agora';
  if (minutes < 60) return `${minutes}m atrás`;
  if (hours < 24) return `${hours}h atrás`;
  if (days < 30) return `${days}d atrás`;
  return formatDate(date);
};

export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

export const isToday = (date: string | Date): boolean => {
  const d = parseDateInput(date);
  const today = new Date();
  return d.toDateString() === today.toDateString();
};

export const getTimeAgo = formatRelativeTime;
export const getRelativeTime = formatRelativeTime;
