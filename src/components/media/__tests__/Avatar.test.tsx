import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Avatar } from '../Avatar';

describe('Avatar', () => {
  it('renders image when src provided', () => {
    render(<Avatar src="https://example.com/avatar.jpg" alt="User" />);
    const img = screen.getByRole('img');
    expect(img).toHaveAttribute('src', 'https://example.com/avatar.jpg');
  });

  it('renders initials when name provided', () => {
    render(<Avatar name="John Doe" />);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('renders fallback icon when no src or name', () => {
    const { container } = render(<Avatar />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('applies size class', () => {
    const { container } = render(<Avatar name="Test" size="lg" />);
    expect(container.firstChild).toHaveClass('h-12');
  });
});
