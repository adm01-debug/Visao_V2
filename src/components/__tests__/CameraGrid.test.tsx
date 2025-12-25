import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CameraGrid } from '../CameraGrid';

const mockCameras = [
  { id: '1', name: 'Camera 1', status: 'online', streamUrl: 'rtsp://test1' },
  { id: '2', name: 'Camera 2', status: 'offline', streamUrl: 'rtsp://test2' },
];

describe('CameraGrid', () => {
  it('renders grid with cameras', () => {
    render(<CameraGrid cameras={mockCameras} />);
    expect(screen.getByText('Camera 1')).toBeInTheDocument();
    expect(screen.getByText('Camera 2')).toBeInTheDocument();
  });

  it('shows empty state when no cameras', () => {
    render(<CameraGrid cameras={[]} />);
    expect(screen.getByText(/no cameras/i)).toBeInTheDocument();
  });

  it('applies correct grid layout', () => {
    const { container } = render(<CameraGrid cameras={mockCameras} columns={2} />);
    expect(container.querySelector('.grid')).toBeInTheDocument();
  });

  it('handles camera click', () => {
    const onSelect = vi.fn();
    render(<CameraGrid cameras={mockCameras} onCameraSelect={onSelect} />);
    screen.getByText('Camera 1').click();
    expect(onSelect).toHaveBeenCalledWith(mockCameras[0]);
  });
});
