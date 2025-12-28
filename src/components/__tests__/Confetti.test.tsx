import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Confetti from '@/components/Confetti';

describe('Confetti', () => {
  it('renders when active', () => {
    render(<Confetti active />);
    expect(screen.getByTestId('confetti-container')).toBeInTheDocument();
  });

  it('does not render when inactive', () => {
    render(<Confetti active={false} />);
    expect(screen.queryByTestId('confetti-container')).not.toBeInTheDocument();
  });

  it('applies custom colors', () => {
    const colors = ['#ff0000', '#00ff00', '#0000ff'];
    render(<Confetti active colors={colors} />);
    const container = screen.getByTestId('confetti-container');
    expect(container).toHaveAttribute('data-colors', colors.join(','));
  });

  it('stops after duration', async () => {
    vi.useFakeTimers();
    render(<Confetti active duration={1000} />);
    expect(screen.getByTestId('confetti-container')).toBeInTheDocument();
    vi.advanceTimersByTime(1000);
    await waitFor(() => expect(screen.queryByTestId('confetti-container')).not.toBeInTheDocument());
    vi.useRealTimers();
  });

  it('calls onComplete when finished', async () => {
    vi.useFakeTimers();
    const onComplete = vi.fn();
    render(<Confetti active duration={1000} onComplete={onComplete} />);
    vi.advanceTimersByTime(1000);
    await waitFor(() => expect(onComplete).toHaveBeenCalled());
    vi.useRealTimers();
  });
});
