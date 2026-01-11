import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState } from '../EmptyState';

describe('EmptyState', () => {
  it('renders title', () => {
    render(<EmptyState title="No data" />);
    expect(screen.getByText('No data')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<EmptyState title="No data" description="Start by adding items" />);
    expect(screen.getByText('Start by adding items')).toBeInTheDocument();
  });

  it('renders icon', () => {
    render(<EmptyState title="No data" icon="📭" />);
    expect(screen.getByText('📭')).toBeInTheDocument();
  });

  it('renders action button', () => {
    const onAction = vi.fn();
    render(<EmptyState title="No data" action={{ label: 'Add Item', onClick: onAction }} />);
    fireEvent.click(screen.getByRole('button', { name: 'Add Item' }));
    expect(onAction).toHaveBeenCalled();
  });

  it('supports custom children', () => {
    render(
      <EmptyState title="No data">
        <p>Custom content</p>
      </EmptyState>
    );
    expect(screen.getByText('Custom content')).toBeInTheDocument();
  });
});
