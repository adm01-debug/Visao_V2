/**
 * VISÃO - Continuous Analysis Helpers
 */

import type { ContinuousAnalysisConfig } from './types';

export function isWithinSchedule(schedule?: ContinuousAnalysisConfig['schedule']): boolean {
  if (!schedule?.enabled) return true;
  const now = new Date();
  const currentDay = now.getDay();
  const currentTime = now.toTimeString().slice(0, 5);
  if (!schedule.days.includes(currentDay)) return false;
  const { startTime, endTime } = schedule;
  if (startTime <= endTime) {
    return currentTime >= startTime && currentTime <= endTime;
  }
  return currentTime >= startTime || currentTime <= endTime;
}

export function getNextScheduledTime(
  schedule: ContinuousAnalysisConfig['schedule'],
  interval: number
): Date {
  const now = new Date();
  if (!schedule?.enabled) return new Date(now.getTime() + interval);
  if (isWithinSchedule(schedule)) return new Date(now.getTime() + interval);

  const { startTime, days } = schedule;
  const [startHour, startMinute] = startTime.split(':').map(Number);
  const nextDate = new Date(now);
  nextDate.setHours(startHour!, startMinute, 0, 0);
  if (nextDate <= now) nextDate.setDate(nextDate.getDate() + 1);
  let attempts = 0;
  while (!days.includes(nextDate.getDay()) && attempts < 7) {
    nextDate.setDate(nextDate.getDate() + 1);
    attempts++;
  }
  return nextDate;
}

export function severityToPriority(severity: string): number {
  const map: Record<string, number> = { low: 1, medium: 2, high: 3, critical: 4 };
  return map[severity] || 0;
}

export function meetsSeverityThreshold(severity: string, minSeverity: string): boolean {
  return severityToPriority(severity) >= severityToPriority(minSeverity);
}
