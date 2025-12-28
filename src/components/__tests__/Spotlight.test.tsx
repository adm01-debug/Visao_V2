import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Spotlight from '@/components/Spotlight';

describe('Spotlight', () => {
  it('renders spotlight overlay', () => {
    render(<Spotlight target="element-id" active />);
    expect(screen.getByTestId('spotlight-overlay')).toBeInTheDocument();
  });

  it('does not render when inactive', () => {
    render(<Spotlight target="element-id" active={false} />);
    expect(screen.queryByTestId('spotlight-overlay')).not.toBeInTheDocument();
  });

  it('shows tooltip content', () => {
    render(<Spotlight target="element-id" active tooltip="Help text" />);
    expect(screen.getByText('Help text')).toBeInTheDocument();
  });

  it('calls onClose when clicked outside', () => {
    const onClose = vi.fn();
    render(<Spotlight target="element-id" active onClose={onClose} />);
    fireEvent.click(screen.getByTestId('spotlight-overlay'));
    expect(onClose).toHaveBeenCalled();
  });
});
