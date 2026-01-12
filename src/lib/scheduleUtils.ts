/**
 * Schedule Utilities
 * @module lib/scheduleUtils
 */

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface TimeSlot {
  start: string;
  end: string;
  days: DayOfWeek[];
}

export function isWithinSchedule(schedule: TimeSlot[], date: Date = new Date()): boolean {
  const day = date.getDay() as DayOfWeek;
  const time = date.toTimeString().slice(0, 5);
  return schedule.some(slot => slot.days.includes(day) && time >= slot.start && time <= slot.end);
}

export function getNextScheduledTime(schedule: TimeSlot[]): Date | null {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  for (let d = 0; d < 7; d++) {
    const checkDate = new Date(now.getTime() + d * dayMs);
    const day = checkDate.getDay() as DayOfWeek;
    for (const slot of schedule) {
      if (slot.days.includes(day)) {
        const [h, m] = slot.start.split(':').map(Number);
        const slotDate = new Date(checkDate);
        slotDate.setHours(h, m, 0, 0);
        if (slotDate > now) return slotDate;
      }
    }
  }
  return null;
}

export function formatSchedule(slot: TimeSlot): string {
  const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  return `${slot.days.map(d => days[d]).join(', ')} ${slot.start}-${slot.end}`;
}

export function createWeekdaySchedule(start: string, end: string): TimeSlot {
  return { start, end, days: [1, 2, 3, 4, 5] };
}

export function createWeekendSchedule(start: string, end: string): TimeSlot {
  return { start, end, days: [0, 6] };
}

export function create24x7Schedule(): TimeSlot {
  return { start: '00:00', end: '23:59', days: [0, 1, 2, 3, 4, 5, 6] };
}

export default { isWithinSchedule, getNextScheduledTime, formatSchedule, createWeekdaySchedule, createWeekendSchedule, create24x7Schedule };
