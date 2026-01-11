import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LoadingState, Spinner, Skeleton, LoadingDots } from '../LoadingState';

describe('LoadingState', () => {
  describe('Spinner', () => {
    it('renders spinner', () => {
      render(<Spinner />);
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('supports different sizes', () => {
      render(<Spinner size="lg" />);
      expect(screen.getByRole('progressbar')).toHaveClass('lg');
    });
  });

  describe('Skeleton', () => {
    it('renders skeleton', () => {
      render(<Skeleton width={200} height={20} />);
      expect(screen.getByTestId('skeleton')).toBeInTheDocument();
    });

    it('applies animation', () => {
      render(<Skeleton width={200} height={20} animate />);
      expect(screen.getByTestId('skeleton')).toHaveClass('animate');
    });
  });

  describe('LoadingDots', () => {
    it('renders loading dots', () => {
      render(<LoadingDots />);
      expect(screen.getByTestId('loading-dots')).toBeInTheDocument();
    });
  });
});
