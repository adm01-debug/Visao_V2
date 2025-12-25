import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { InfiniteScroll } from '../InfiniteScroll';

describe('InfiniteScroll', () => {
  let mockObserver: { observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockObserver = { observe: vi.fn(), disconnect: vi.fn() };
    vi.stubGlobal('IntersectionObserver', vi.fn(() => mockObserver));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders children', () => {
    render(<InfiniteScroll onLoadMore={vi.fn()}><div>Content</div></InfiniteScroll>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('shows loading indicator', () => {
    render(<InfiniteScroll onLoadMore={vi.fn()} isLoading><div>Content</div></InfiniteScroll>);
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('observes sentinel element', () => {
    render(<InfiniteScroll onLoadMore={vi.fn()}><div>Content</div></InfiniteScroll>);
    expect(mockObserver.observe).toHaveBeenCalled();
  });

  it('disconnects on unmount', () => {
    const { unmount } = render(<InfiniteScroll onLoadMore={vi.fn()}><div>Content</div></InfiniteScroll>);
    unmount();
    expect(mockObserver.disconnect).toHaveBeenCalled();
  });
});
