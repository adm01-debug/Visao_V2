import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from '../Avatar';

describe('Avatar', () => {
  it('renders image when src provided', () => {
    render(<Avatar src="/test.jpg" name="John Doe" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', '/test.jpg');
  });

  it('renders initials when no src', () => {
    render(<Avatar name="John Doe" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('handles single name', () => {
    render(<Avatar name="John" />);
    expect(screen.getByText('JO')).toBeInTheDocument();
  });

  it('applies size classes', () => {
    const { container } = render(<Avatar name="John" size="lg" />);
    expect(container.firstChild).toHaveClass('h-12', 'w-12');
  });
});
