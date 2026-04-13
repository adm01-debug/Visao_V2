/**
 * VISÃO - Alert filtering utility
 */
import { startOfDay, endOfDay, subDays, subHours, isWithinInterval } from 'date-fns';
import type { AlertFilters } from './alertFilterTypes';

export function filterAlerts<T extends { type: string; severity: string; timestamp: string | Date; cameraId?: string }>(
  alerts: T[],
  filters: AlertFilters
): T[] {
  return alerts.filter(alert => {
    if (filters.type !== 'all' && alert.type !== filters.type) return false;
    if (filters.severity !== 'all' && alert.severity !== filters.severity) return false;
    if (filters.cameraId !== 'all' && alert.cameraId !== filters.cameraId) return false;

    if (filters.dateRange !== 'all') {
      const alertDate = new Date(alert.timestamp);
      const now = new Date();

      switch (filters.dateRange) {
        case '1h':
          if (alertDate < subHours(now, 1)) return false;
          break;
        case '24h':
          if (alertDate < subHours(now, 24)) return false;
          break;
        case '7d':
          if (alertDate < subDays(now, 7)) return false;
          break;
        case '30d':
          if (alertDate < subDays(now, 30)) return false;
          break;
        case 'custom':
          if (filters.customDateStart && filters.customDateEnd) {
            if (!isWithinInterval(alertDate, {
              start: startOfDay(filters.customDateStart),
              end: endOfDay(filters.customDateEnd),
            })) {
              return false;
            }
          }
          break;
      }
    }

    return true;
  });
}
