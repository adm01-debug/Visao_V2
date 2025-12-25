import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { LazyImage } from '../LazyImage';

describe('LazyImage', () => {
  let mockObserver: { observe: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; unobserve: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockObserver = { observe: vi.fn(), disconnect: vi.fn(), unobserve: vi.fn() };
    vi.stubGlobal('IntersectionObserver', vi.fn((cb) => {
      setTimeout(() => cb([{ isIntersecting: true }]), 0);
      return mockObserver;
    }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders placeholder initially', () => {
    render(<LazyImage src="/test.jpg" alt="Test" />);
    expect(screen.getByTestId('image-placeholder')).toBeInTheDocument();
  });

  it('loads image when intersecting', async () => {
    render(<LazyImage src="/test.jpg" alt="Test" />);
    await waitFor(() => {
      expect(screen.getByRole('img')).toHaveAttribute('src', '/test.jpg');
    });
  });

  it('applies custom className', () => {
    render(<LazyImage src="/test.jpg" alt="Test" className="custom-class" />);
    expect(screen.getByTestId('lazy-image-container')).toHaveClass('custom-class');
  });

  it('shows fallback on error', async () => {
    render(<LazyImage src="/invalid.jpg" alt="Test" fallback="/fallback.jpg" />);
    const img = await screen.findByRole('img');
    img.dispatchEvent(new Event('error'));
    expect(img).toHaveAttribute('src', '/fallback.jpg');
  });
});
