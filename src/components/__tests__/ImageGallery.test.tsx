import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ImageGallery from '@/components/ImageGallery';

const mockImages = [
  { src: 'image1.jpg', alt: 'Image 1' },
  { src: 'image2.jpg', alt: 'Image 2' },
  { src: 'image3.jpg', alt: 'Image 3' },
];

describe('ImageGallery', () => {
  it('renders gallery container', () => {
    render(<ImageGallery images={mockImages} />);
    expect(screen.getByTestId('image-gallery')).toBeInTheDocument();
  });

  it('displays all images', () => {
    render(<ImageGallery images={mockImages} />);
    expect(screen.getAllByRole('img')).toHaveLength(3);
  });

  it('opens lightbox on image click', () => {
    render(<ImageGallery images={mockImages} />);
    fireEvent.click(screen.getAllByRole('img')[0]);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('navigates to next image', () => {
    render(<ImageGallery images={mockImages} />);
    fireEvent.click(screen.getAllByRole('img')[0]);
    fireEvent.click(screen.getByRole('button', { name: /próximo/i }));
    expect(screen.getByAltText('Image 2')).toBeInTheDocument();
  });

  it('shows thumbnails when enabled', () => {
    render(<ImageGallery images={mockImages} showThumbnails />);
    expect(screen.getByTestId('thumbnails')).toBeInTheDocument();
  });
});
