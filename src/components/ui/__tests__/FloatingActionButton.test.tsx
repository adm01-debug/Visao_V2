import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FloatingActionButton } from '../FloatingActionButton';

describe('FloatingActionButton', () => {
  it('renders button', () => {
    render(<FloatingActionButton onClick={vi.fn()} icon="+" />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(<FloatingActionButton onClick={onClick} icon="+" />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalled();
  });

  it('positions correctly', () => {
    render(<FloatingActionButton onClick={vi.fn()} icon="+" position="bottom-right" />);
    expect(screen.getByRole('button')).toHaveClass('bottom-right');
  });

  it('supports extended variant with label', () => {
    render(<FloatingActionButton onClick={vi.fn()} icon="+" label="Add" extended />);
    expect(screen.getByText('Add')).toBeInTheDocument();
  });

  it('supports mini size', () => {
    render(<FloatingActionButton onClick={vi.fn()} icon="+" size="mini" />);
    expect(screen.getByRole('button')).toHaveClass('mini');
  });
});
