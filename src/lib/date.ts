/**
 * Date utilities
 * Consolidated date functions
 * 
 * @module lib/date
 */

export { formatDate, formatDateTime, getRelativeTime } from '@/utils/date';
export { 
  formatDistanceToNow, 
  isSameDay, 
  isBefore, 
  isAfter, 
  isBetween,
  getDaysInMonth,
  getFirstDayOfMonth,
  parseISO,
  toISO,
} from './dateHelpers';

export function parseDate(dateString: string): Date {
  return new Date(dateString);
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

export function isToday(date: Date): boolean {
  const today = new Date();
  return date.toDateString() === today.toDateString();
}

export default { 
  formatDate: (d: Date, f?: string) => (typeof f === 'string' ? d.toLocaleDateString('pt-BR') : d.toLocaleDateString('pt-BR')), 
  parseDate, 
  addDays, 
  diffDays, 
  isToday 
};
