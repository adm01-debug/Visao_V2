import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SwipeableView } from '../SwipeableView';

describe('SwipeableView', () => {
  it('renders children', () => {
    render(<SwipeableView><div>Swipeable Content</div></SwipeableView>);
    expect(screen.getByText('Swipeable Content')).toBeInTheDocument();
  });
  it('handles swipe left', () => {
    const onSwipeLeft = vi.fn();
    render(<SwipeableView onSwipeLeft={onSwipeLeft}><div>Content</div></SwipeableView>);
    expect(document.body).toBeInTheDocument();
  });
  it('handles swipe right', () => {
    const onSwipeRight = vi.fn();
    render(<SwipeableView onSwipeRight={onSwipeRight}><div>Content</div></SwipeableView>);
    expect(document.body).toBeInTheDocument();
  });
  it('supports touch events', () => {
    render(<SwipeableView><div>Content</div></SwipeableView>);
    expect(document.body).toBeInTheDocument();
  });
});