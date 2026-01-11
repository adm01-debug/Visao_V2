import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EventTimeline } from '../EventTimeline';

const mockEvents = [
  { id: '1', title: 'Event 1', timestamp: new Date('2024-01-01T10:00:00'), type: 'info' },
  { id: '2', title: 'Event 2', timestamp: new Date('2024-01-01T11:00:00'), type: 'warning' },
  { id: '3', title: 'Event 3', timestamp: new Date('2024-01-01T12:00:00'), type: 'error' },
];

describe('EventTimeline', () => {
  it('renders timeline with events', () => {
    render(<EventTimeline events={mockEvents} />);
    expect(screen.getByText('Event 1')).toBeInTheDocument();
    expect(screen.getByText('Event 2')).toBeInTheDocument();
  });

  it('renders empty state when no events', () => {
    render(<EventTimeline events={[]} />);
    expect(screen.getByText(/no events/i)).toBeInTheDocument();
  });

  it('displays event timestamps', () => {
    render(<EventTimeline events={mockEvents} showTimestamp />);
    expect(screen.getByText(/10:00/)).toBeInTheDocument();
  });

  it('calls onEventClick when event is clicked', () => {
    const onEventClick = vi.fn();
    render(<EventTimeline events={mockEvents} onEventClick={onEventClick} />);
    fireEvent.click(screen.getByText('Event 1'));
    expect(onEventClick).toHaveBeenCalledWith(mockEvents[0]);
  });

  it('applies correct type styling', () => {
    render(<EventTimeline events={mockEvents} />);
    const warningEvent = screen.getByText('Event 2').closest('.timeline-event');
    expect(warningEvent).toHaveClass('event-warning');
  });

  it('supports vertical layout', () => {
    render(<EventTimeline events={mockEvents} layout="vertical" />);
    expect(screen.getByTestId('timeline')).toHaveClass('vertical');
  });

  it('supports horizontal layout', () => {
    render(<EventTimeline events={mockEvents} layout="horizontal" />);
    expect(screen.getByTestId('timeline')).toHaveClass('horizontal');
  });
});
