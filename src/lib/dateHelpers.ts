/**
 * Date Helpers
 * @module lib/dateHelpers
 */

export function formatDistanceToNow(date: Date): string {
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  const weeks = Math.floor(days / 7);
  const months = Math.floor(days / 30);
  const years = Math.floor(days / 365);

  if (years > 0) return `${years} ano${years > 1 ? 's' : ''} atrás`;
  if (months > 0) return `${months} mês${months > 1 ? 'es' : ''} atrás`;
  if (weeks > 0) return `${weeks} semana${weeks > 1 ? 's' : ''} atrás`;
  if (days > 0) return `${days} dia${days > 1 ? 's' : ''} atrás`;
  if (hours > 0) return `${hours} hora${hours > 1 ? 's' : ''} atrás`;
  if (minutes > 0) return `${minutes} minuto${minutes > 1 ? 's' : ''} atrás`;
  return 'agora';
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

export function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

export function parseISO(isoString: string): Date {
  return new Date(isoString);
}

export function toISO(date: Date): string {
  return date.toISOString();
}

export default {
  formatDistanceToNow, isSameDay, isBefore, isAfter, isBetween,
  getDaysInMonth, getFirstDayOfMonth, parseISO, toISO,
};
