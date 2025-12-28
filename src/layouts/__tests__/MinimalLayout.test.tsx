import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MinimalLayout from '@/layouts/MinimalLayout';

describe('MinimalLayout', () => {
  it('renders children', () => {
    render(<MinimalLayout><div>Minimal Content</div></MinimalLayout>);
    expect(screen.getByText('Minimal Content')).toBeInTheDocument();
  });

  it('has minimal container', () => {
    render(<MinimalLayout><div>Content</div></MinimalLayout>);
    expect(screen.getByTestId('minimal-layout')).toBeInTheDocument();
  });

  it('does not have navigation', () => {
    render(<MinimalLayout><div>Content</div></MinimalLayout>);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
