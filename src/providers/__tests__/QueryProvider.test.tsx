import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { QueryProvider } from '@/providers/QueryProvider';

describe('QueryProvider', () => {
  it('renders children', () => {
    render(<QueryProvider><div>Query Content</div></QueryProvider>);
    expect(screen.getByText('Query Content')).toBeInTheDocument();
  });

  it('provides query client', () => {
    const { container } = render(<QueryProvider><div>Test</div></QueryProvider>);
    expect(container.firstChild).toBeDefined();
  });
});
