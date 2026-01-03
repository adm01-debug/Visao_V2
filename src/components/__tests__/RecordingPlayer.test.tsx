import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RecordingPlayer } from '../RecordingPlayer';

const mockRecording = {
  id: '1',
  cameraId: 'cam-1',
  cameraName: 'Câmera Entrada',
  url: 'http://example.com/video.mp4',
  thumbnailUrl: 'http://example.com/thumb.jpg',
  startTime: new Date('2024-01-15T10:00:00'),
  endTime: new Date('2024-01-15T10:30:00'),
  duration: 1800,
  hasAlert: true,
};

describe('RecordingPlayer', () => {
  it('renders recording player', () => {
    render(<RecordingPlayer recording={mockRecording} />);
    expect(screen.getByText('Câmera Entrada')).toBeInTheDocument();
  });

  it('shows alert badge when hasAlert is true', () => {
    render(<RecordingPlayer recording={mockRecording} />);
    expect(screen.getByText('Alerta')).toBeInTheDocument();
  });

  it('does not show alert badge when hasAlert is false', () => {
    render(<RecordingPlayer recording={{ ...mockRecording, hasAlert: false }} />);
    expect(screen.queryByText('Alerta')).not.toBeInTheDocument();
  });

  it('shows timestamp', () => {
    render(<RecordingPlayer recording={mockRecording} />);
    expect(screen.getByText(/15\/01\/2024/)).toBeInTheDocument();
  });

  it('shows video element', () => {
    const { container } = render(<RecordingPlayer recording={mockRecording} />);
    expect(container.querySelector('video')).toBeInTheDocument();
  });

  it('shows playback controls', () => {
    const { container } = render(<RecordingPlayer recording={mockRecording} />);
    
    expect(container.querySelector('.lucide-play')).toBeInTheDocument();
    expect(container.querySelector('.lucide-skip-back')).toBeInTheDocument();
    expect(container.querySelector('.lucide-skip-forward')).toBeInTheDocument();
  });

  it('shows volume controls', () => {
    const { container } = render(<RecordingPlayer recording={mockRecording} />);
    expect(container.querySelector('.lucide-volume-2')).toBeInTheDocument();
  });

  it('shows snapshot button when onSnapshot provided', () => {
    const onSnapshot = vi.fn();
    const { container } = render(<RecordingPlayer recording={mockRecording} onSnapshot={onSnapshot} />);
    
    expect(container.querySelector('.lucide-camera')).toBeInTheDocument();
  });

  it('shows download button when onDownload provided', () => {
    const onDownload = vi.fn();
    const { container } = render(<RecordingPlayer recording={mockRecording} onDownload={onDownload} />);
    
    const downloadButton = container.querySelector('.lucide-download');
    expect(downloadButton).toBeInTheDocument();
  });

  it('shows fullscreen button', () => {
    const { container } = render(<RecordingPlayer recording={mockRecording} />);
    expect(container.querySelector('.lucide-maximize')).toBeInTheDocument();
  });

  it('shows playback rate button', () => {
    render(<RecordingPlayer recording={mockRecording} />);
    expect(screen.getByText('1x')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <RecordingPlayer recording={mockRecording} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
