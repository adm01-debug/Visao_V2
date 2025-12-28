import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FloatingAction from '@/components/FloatingAction';

describe('FloatingAction', () => {
  it('renders FAB button', () => {
    render(<FloatingAction onClick={vi.fn()} icon="+" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<FloatingAction onClick={onClick} icon="+" />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('applies position class', () => {
    render(<FloatingAction onClick={vi.fn()} icon="+" position="bottom-right" />);
    expect(screen.getByRole('button')).toHaveClass('bottom-right');
  });

  it('expands with actions on click', () => {
    const actions = [{ icon: '📁', onClick: vi.fn() }, { icon: '⚙️', onClick: vi.fn() }];
    render(<FloatingAction onClick={vi.fn()} icon="+" actions={actions} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getAllByRole('button')).toHaveLength(3);
  });
});
