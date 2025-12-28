import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import A11yAnnouncer from '@/components/A11yAnnouncer';

describe('A11yAnnouncer', () => {
  it('renders with aria-live polite by default', () => {
    render(<A11yAnnouncer message="Test message" />);
    const announcer = screen.getByRole('status');
    expect(announcer).toHaveAttribute('aria-live', 'polite');
  });

  it('renders with aria-live assertive when priority is high', () => {
    render(<A11yAnnouncer message="Urgent message" priority="assertive" />);
    const announcer = screen.getByRole('alert');
    expect(announcer).toHaveAttribute('aria-live', 'assertive');
  });

  it('is visually hidden but accessible to screen readers', () => {
    render(<A11yAnnouncer message="Hidden message" />);
    const announcer = screen.getByRole('status');
    expect(announcer).toHaveClass('sr-only');
  });

  it('updates message content', () => {
    const { rerender } = render(<A11yAnnouncer message="First" />);
    expect(screen.getByText('First')).toBeInTheDocument();
    rerender(<A11yAnnouncer message="Second" />);
    expect(screen.getByText('Second')).toBeInTheDocument();
  });

  it('clears message after timeout', async () => {
    vi.useFakeTimers();
    render(<A11yAnnouncer message="Temporary" clearAfter={1000} />);
    expect(screen.getByText('Temporary')).toBeInTheDocument();
    vi.advanceTimersByTime(1000);
    expect(screen.queryByText('Temporary')).not.toBeInTheDocument();
    vi.useRealTimers();
  });
});
