import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ImageCropper from '@/components/ImageCropper';

describe('ImageCropper', () => {
  const mockOnCrop = vi.fn();
  const testImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  it('renders image cropper', () => {
    render(<ImageCropper src={testImage} onCrop={mockOnCrop} />);
    expect(screen.getByTestId('image-cropper')).toBeInTheDocument();
  });

  it('displays source image', () => {
    render(<ImageCropper src={testImage} onCrop={mockOnCrop} />);
    expect(screen.getByRole('img')).toHaveAttribute('src', testImage);
  });

  it('shows aspect ratio controls', () => {
    render(<ImageCropper src={testImage} onCrop={mockOnCrop} showAspectRatios />);
    expect(screen.getByText('1:1')).toBeInTheDocument();
    expect(screen.getByText('16:9')).toBeInTheDocument();
  });

  it('calls onCrop when crop button clicked', async () => {
    render(<ImageCropper src={testImage} onCrop={mockOnCrop} />);
    fireEvent.click(screen.getByRole('button', { name: /cortar/i }));
    await waitFor(() => expect(mockOnCrop).toHaveBeenCalled());
  });

  it('shows zoom controls', () => {
    render(<ImageCropper src={testImage} onCrop={mockOnCrop} showZoom />);
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });
});
