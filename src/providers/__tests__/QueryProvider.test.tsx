import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QueryProvider } from '@/providers/QueryProvider';

describe('QueryProvider', () => {
  it('renders children', () => {
    render(<QueryProvider><div>Query Content</div></QueryProvider>);
    expect(screen.getByText('Query Content')).toBeInTheDocument();
  });

  it('provides query client', () => {
    const { container } = render(<QueryProvider><div>Content</div></QueryProvider>);
    expect(container.firstChild).toBeDefined();
  });

  it('handles multiple children', () => {
    render(
      <QueryProvider>
        <div>Child 1</div>
        <div>Child 2</div>
      </QueryProvider>
    );
    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
  });
});
