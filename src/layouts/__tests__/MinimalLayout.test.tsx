import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MinimalLayout from '@/layouts/MinimalLayout';

describe('MinimalLayout', () => {
  it('renders children', () => {
    render(<MinimalLayout><div>Minimal Content</div></MinimalLayout>);
    expect(screen.getByText('Minimal Content')).toBeInTheDocument();
  });

  it('has minimal wrapper', () => {
    const { container } = render(<MinimalLayout><div>Content</div></MinimalLayout>);
    expect(container.firstChild).toHaveClass('minimal-layout');
  });

  it('does not show header', () => {
    render(<MinimalLayout><div>Content</div></MinimalLayout>);
    expect(screen.queryByRole('banner')).not.toBeInTheDocument();
  });

  it('does not show footer', () => {
    render(<MinimalLayout><div>Content</div></MinimalLayout>);
    expect(screen.queryByRole('contentinfo')).not.toBeInTheDocument();
  });

  it('centers content', () => {
    const { container } = render(<MinimalLayout><div>Content</div></MinimalLayout>);
    expect(container.firstChild).toHaveStyle({ display: 'flex' });
  });
});
