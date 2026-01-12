import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Container } from '../Container';

describe('Container', () => {
  it('renders children', () => {
    render(<Container>Content</Container>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('applies size classes', () => {
    const { container } = render(<Container size="sm">Content</Container>);
    expect(container.firstChild).toHaveClass('max-w-screen-sm');
  });

  it('applies custom className', () => {
    const { container } = render(<Container className="custom">Content</Container>);
    expect(container.firstChild).toHaveClass('custom');
  });
});
