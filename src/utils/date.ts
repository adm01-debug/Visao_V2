/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Date Utilities - Funções utilitárias para datas
 *
 * @module utils/date
 */

// ============================================
// FORMATAÇÃO
// ============================================

export function formatDate(date: Date | string, locale = "pt-BR"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(date: Date | string, locale = "pt-BR"): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(locale, { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}min`;
  const hours = Math.floor(minutes / 60);
  const remainingMins = minutes % 60;
  return remainingMins > 0 ? `${hours}h ${remainingMins}min` : `${hours}h`;
}

export function getRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const diff = Date.now() - d.getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return "agora";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h atrás`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d atrás`;
  const weeks = Math.floor(days / 7);
  if (weeks < 4) return `${weeks} semana${weeks > 1 ? 's' : ''} atrás`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} mês${months > 1 ? 'es' : ''} atrás`;
  const years = Math.floor(days / 365);
  return `${years} ano${years > 1 ? 's' : ''} atrás`;
}

// ============================================
// COMPARAÇÃO
// ============================================

export function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export function isYesterday(date: Date): boolean {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return date.toDateString() === yesterday.toDateString();
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

export function isBefore(date1: Date, date2: Date): boolean {
  return date1.getTime() < date2.getTime();
}

export function isAfter(date1: Date, date2: Date): boolean {
  return date1.getTime() > date2.getTime();
}

export function isBetween(date: Date, start: Date, end: Date): boolean {
  return date.getTime() >= start.getTime() && date.getTime() <= end.getTime();
}

// ============================================
// MANIPULAÇÃO
// ============================================

export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

export function parseISO(isoString: string): Date {
  return new Date(isoString);
}

export function toISO(date: Date): string {
  return date.toISOString();
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function diffDays(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

// ============================================
// EXPORT DEFAULT
// ============================================

export default {
  formatDate,
  formatDateTime,
  formatDuration,
  getRelativeTime,
  isToday,
  isYesterday,
  isSameDay,
  isBefore,
  isAfter,
  isBetween,
  parseDate,
  parseISO,
  toISO,
  addDays,
  diffDays,
  getDaysInMonth,
  getFirstDayOfMonth,
};
