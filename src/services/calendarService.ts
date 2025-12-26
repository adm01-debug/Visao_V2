/**
 * Calendar Service
 * Calendar integration
 */
export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  attendees?: string[];
  recurrence?: string;
}

class CalendarService {
  private provider: 'google' | 'outlook' | 'local' = 'local';
  private events: CalendarEvent[] = [];

  configure(provider: 'google' | 'outlook' | 'local') { this.provider = provider; }

  async getEvents(start: Date, end: Date): Promise<CalendarEvent[]> {
    return this.events.filter(e => e.start >= start && e.end <= end);
  }

  async createEvent(event: Omit<CalendarEvent, 'id'>): Promise<CalendarEvent> {
    const newEvent = { ...event, id: `evt_${Date.now()}` };
    this.events.push(newEvent);
    return newEvent;
  }

  async updateEvent(id: string, updates: Partial<CalendarEvent>): Promise<CalendarEvent | null> {
    const index = this.events.findIndex(e => e.id === id);
    if (index === -1) return null;
    this.events[index] = { ...this.events[index], ...updates };
    return this.events[index];
  }

  async deleteEvent(id: string): Promise<boolean> {
    const index = this.events.findIndex(e => e.id === id);
    if (index === -1) return false;
    this.events.splice(index, 1);
    return true;
  }

  generateICS(event: CalendarEvent): string {
    const formatDate = (d: Date) => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    return `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${formatDate(event.start)}
DTEND:${formatDate(event.end)}
SUMMARY:${event.title}
DESCRIPTION:${event.description || ''}
LOCATION:${event.location || ''}
END:VEVENT
END:VCALENDAR`;
  }

  downloadICS(event: CalendarEvent): void {
    const ics = this.generateICS(event);
    const blob = new Blob([ics], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.title}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  }
}

export const calendarService = new CalendarService();
export default calendarService;
