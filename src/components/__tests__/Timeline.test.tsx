import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Timeline from '@/components/Timeline';

const mockEvents = [
  { id: '1', title: 'Event 1', date: '2025-01-01', description: 'First event' },
  { id: '2', title: 'Event 2', date: '2025-01-15', description: 'Second event' },
];

describe('Timeline', () => {
  it('renders timeline container', () => {
    render(<Timeline events={mockEvents} />);
    expect(screen.getByTestId('timeline')).toBeInTheDocument();
  });

  it('displays event titles', () => {
    render(<Timeline events={mockEvents} />);
    expect(screen.getByText('Event 1')).toBeInTheDocument();
    expect(screen.getByText('Event 2')).toBeInTheDocument();
  });

  it('shows event dates', () => {
    render(<Timeline events={mockEvents} />);
    expect(screen.getByText(/2025-01-01/)).toBeInTheDocument();
  });

  it('handles empty events', () => {
    render(<Timeline events={[]} />);
    expect(screen.getByText(/nenhum evento/i)).toBeInTheDocument();
  });

  it('applies horizontal layout', () => {
    render(<Timeline events={mockEvents} layout="horizontal" />);
    expect(screen.getByTestId('timeline')).toHaveClass('horizontal');
  });
});
