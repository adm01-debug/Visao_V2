import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { ProgressiveImage } from '../ProgressiveImage';

describe('ProgressiveImage', () => {
  it('renders placeholder initially', () => {
    render(<ProgressiveImage src="test.jpg" placeholder="placeholder.jpg" alt="Test" />);
    expect(screen.getByRole('img')).toHaveAttribute('src', 'placeholder.jpg');
  });

  it('loads full image', async () => {
    render(<ProgressiveImage src="test.jpg" placeholder="placeholder.jpg" alt="Test" />);
    await waitFor(() => {
      expect(screen.getByRole('img')).toHaveAttribute('src', 'test.jpg');
    });
  });

  it('applies blur effect on placeholder', () => {
    render(<ProgressiveImage src="test.jpg" placeholder="placeholder.jpg" alt="Test" blur />);
    expect(screen.getByRole('img')).toHaveClass('blur');
  });

  it('shows loading indicator', () => {
    render(<ProgressiveImage src="test.jpg" placeholder="placeholder.jpg" alt="Test" showLoading />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  it('calls onLoad when image loads', async () => {
    const onLoad = vi.fn();
    render(<ProgressiveImage src="test.jpg" placeholder="placeholder.jpg" alt="Test" onLoad={onLoad} />);
    await waitFor(() => {
      expect(onLoad).toHaveBeenCalled();
    });
  });
});
