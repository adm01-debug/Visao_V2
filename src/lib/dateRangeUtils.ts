/**
 * Date Range Utilities
 * @module lib/dateRangeUtils
 */

export interface DateRange {
  start: Date;
  end: Date;
}

export function today(): DateRange {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function yesterday(): DateRange {
  const start = new Date();
  start.setDate(start.getDate() - 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function last7Days(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

export function last30Days(): DateRange {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 29);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

export function thisMonth(): DateRange {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  return { start, end };
}

export function lastMonth(): DateRange {
  const end = new Date();
  end.setDate(0);
  end.setHours(23, 59, 59, 999);
  const start = new Date(end);
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  return { start, end };
}

export function isWithinRange(date: Date, range: DateRange): boolean {
  return date >= range.start && date <= range.end;
}

export default { today, yesterday, last7Days, last30Days, thisMonth, lastMonth, isWithinRange };
