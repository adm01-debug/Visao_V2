/**
 * Date utilities
 */

export function formatDate(date: Date, format = "yyyy-MM-dd"): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  
  return format
    .replace("yyyy", String(year))
    .replace("MM", month)
    .replace("dd", day);
}

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

export default { formatDate, parseDate, addDays, diffDays, isToday };

