import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Skeleton, SkeletonCard, SkeletonList } from '../Skeleton';

describe('Skeleton', () => {
  it('renders with default variant', () => {
    const { container } = render(<Skeleton />);
    expect(container.firstChild).toHaveClass('animate-pulse');
  });

  it('renders circular variant', () => {
    const { container } = render(<Skeleton variant="circular" />);
    expect(container.firstChild).toHaveClass('rounded-full');
  });

  it('applies custom dimensions', () => {
    const { container } = render(<Skeleton width={100} height={50} />);
    expect(container.firstChild).toHaveStyle({ width: '100px', height: '50px' });
  });
});

describe('SkeletonCard', () => {
  it('renders skeleton card', () => {
    const { container } = render(<SkeletonCard />);
    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
  });
});

describe('SkeletonList', () => {
  it('renders correct number of items', () => {
    const { container } = render(<SkeletonList count={3} />);
    expect(container.querySelectorAll('.flex.items-center')).toHaveLength(3);
  });
});
