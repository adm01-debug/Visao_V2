import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CircularProgress } from '../CircularProgress';

describe('CircularProgress', () => {
  it('renders svg', () => {
    const { container } = render(<CircularProgress value={50} />);
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('renders label by default', () => {
    render(<CircularProgress value={50} />);
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('hides label when showLabel is false', () => {
    render(<CircularProgress value={50} showLabel={false} />);
    expect(screen.queryByText('50%')).not.toBeInTheDocument();
  });

  it('renders with custom size', () => {
    const { container } = render(<CircularProgress value={50} size={100} />);
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '100');
    expect(svg).toHaveAttribute('height', '100');
  });
});
