import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CameraFocusMode } from '../CameraFocusMode';

describe('CameraFocusMode', () => {
  it('renders camera view', () => {
    render(<CameraFocusMode cameraId="cam1" onClose={vi.fn()} />);
    expect(screen.getByTestId('camera-focus')).toBeInTheDocument();
  });

  it('displays camera controls', () => {
    render(<CameraFocusMode cameraId="cam1" onClose={vi.fn()} showControls />);
    expect(screen.getByRole('button', { name: /zoom/i })).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<CameraFocusMode cameraId="cam1" onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it('supports fullscreen mode', () => {
    render(<CameraFocusMode cameraId="cam1" onClose={vi.fn()} fullscreen />);
    expect(screen.getByTestId('camera-focus')).toHaveClass('fullscreen');
  });
});
