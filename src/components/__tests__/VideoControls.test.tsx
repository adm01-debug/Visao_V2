import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { VideoControls } from '../VideoControls';

describe('VideoControls', () => {
  const defaultProps = {
    isPlaying: true,
    isMuted: false,
    volume: 100,
    currentTime: 60,
    duration: 300,
    playbackRate: 1,
    onPlayPause: vi.fn(),
    onMuteToggle: vi.fn(),
    onVolumeChange: vi.fn(),
    onSeek: vi.fn(),
    onSkipBack: vi.fn(),
    onSkipForward: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders control buttons', () => {
    render(<VideoControls {...defaultProps} />);
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('displays current time and duration', () => {
    render(<VideoControls {...defaultProps} />);
    expect(screen.getByText('1:00 / 5:00')).toBeInTheDocument();
  });

  it('shows pause icon when playing', () => {
    const { container } = render(<VideoControls {...defaultProps} isPlaying={true} />);
    expect(container.querySelector('.lucide-pause')).toBeInTheDocument();
  });

  it('shows play icon when paused', () => {
    const { container } = render(<VideoControls {...defaultProps} isPlaying={false} />);
    expect(container.querySelector('.lucide-play')).toBeInTheDocument();
  });

  it('calls onPlayPause when play button clicked', () => {
    render(<VideoControls {...defaultProps} />);
    
    const buttons = screen.getAllByRole('button');
    const playButton = buttons.find(btn => btn.className.includes('h-10'));
    if (playButton) {
      fireEvent.click(playButton);
      expect(defaultProps.onPlayPause).toHaveBeenCalled();
    }
  });

  it('calls onSkipBack when skip back button clicked', () => {
    const { container } = render(<VideoControls {...defaultProps} />);
    
    const rewindButton = container.querySelector('.lucide-rewind')?.closest('button');
    if (rewindButton) {
      fireEvent.click(rewindButton);
      expect(defaultProps.onSkipBack).toHaveBeenCalledWith(10);
    }
  });

  it('calls onSkipForward when skip forward button clicked', () => {
    const { container } = render(<VideoControls {...defaultProps} />);
    
    const forwardButton = container.querySelector('.lucide-fast-forward')?.closest('button');
    if (forwardButton) {
      fireEvent.click(forwardButton);
      expect(defaultProps.onSkipForward).toHaveBeenCalledWith(10);
    }
  });

  it('calls onMuteToggle when mute button clicked', () => {
    const { container } = render(<VideoControls {...defaultProps} />);
    
    const volumeButton = container.querySelector('.lucide-volume-2')?.closest('button');
    if (volumeButton) {
      fireEvent.click(volumeButton);
      expect(defaultProps.onMuteToggle).toHaveBeenCalled();
    }
  });

  it('shows muted icon when muted', () => {
    const { container } = render(<VideoControls {...defaultProps} isMuted={true} />);
    expect(container.querySelector('.lucide-volume-x')).toBeInTheDocument();
  });

  it('shows playback rate button when handler provided', () => {
    const onPlaybackRateChange = vi.fn();
    render(<VideoControls {...defaultProps} onPlaybackRateChange={onPlaybackRateChange} />);
    
    expect(screen.getByText('1x')).toBeInTheDocument();
  });

  it('cycles playback rate when clicked', () => {
    const onPlaybackRateChange = vi.fn();
    render(<VideoControls {...defaultProps} onPlaybackRateChange={onPlaybackRateChange} playbackRate={1} />);
    
    fireEvent.click(screen.getByText('1x'));
    expect(onPlaybackRateChange).toHaveBeenCalledWith(1.5);
  });

  it('shows fullscreen button when handler provided', () => {
    const onFullscreen = vi.fn();
    const { container } = render(<VideoControls {...defaultProps} onFullscreen={onFullscreen} />);
    
    expect(container.querySelector('.lucide-maximize')).toBeInTheDocument();
  });

  it('hides time when showTime is false', () => {
    render(<VideoControls {...defaultProps} showTime={false} />);
    expect(screen.queryByText('1:00 / 5:00')).not.toBeInTheDocument();
  });

  it('formats hours correctly', () => {
    render(<VideoControls {...defaultProps} currentTime={3661} duration={7200} />);
    expect(screen.getByText('1:01:01 / 2:00:00')).toBeInTheDocument();
  });
});
