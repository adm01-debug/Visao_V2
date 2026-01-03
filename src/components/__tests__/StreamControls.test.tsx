import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StreamControls } from '../StreamControls';

describe('StreamControls', () => {
  const defaultProps = {
    isPlaying: true,
    isMuted: false,
    volume: 100,
    isFullscreen: false,
    onPlayPause: vi.fn(),
    onMuteToggle: vi.fn(),
    onVolumeChange: vi.fn(),
    onFullscreenToggle: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders control buttons', () => {
    render(<StreamControls {...defaultProps} />);
    
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('shows pause icon when playing', () => {
    const { container } = render(<StreamControls {...defaultProps} isPlaying={true} />);
    expect(container.querySelector('.lucide-pause')).toBeInTheDocument();
  });

  it('shows play icon when paused', () => {
    const { container } = render(<StreamControls {...defaultProps} isPlaying={false} />);
    expect(container.querySelector('.lucide-play')).toBeInTheDocument();
  });

  it('calls onPlayPause when play button clicked', () => {
    render(<StreamControls {...defaultProps} />);
    
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]); // First button is play/pause
    
    expect(defaultProps.onPlayPause).toHaveBeenCalled();
  });

  it('calls onMuteToggle when mute button clicked', () => {
    render(<StreamControls {...defaultProps} />);
    
    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[1]); // Second button is mute
    
    expect(defaultProps.onMuteToggle).toHaveBeenCalled();
  });

  it('shows muted icon when muted', () => {
    const { container } = render(<StreamControls {...defaultProps} isMuted={true} />);
    expect(container.querySelector('.lucide-volume-x')).toBeInTheDocument();
  });

  it('shows volume icon when not muted', () => {
    const { container } = render(<StreamControls {...defaultProps} isMuted={false} />);
    expect(container.querySelector('.lucide-volume-2')).toBeInTheDocument();
  });

  it('calls onFullscreenToggle when fullscreen button clicked', () => {
    render(<StreamControls {...defaultProps} />);
    
    const buttons = screen.getAllByRole('button');
    const fullscreenButton = buttons[buttons.length - 1]; // Last button
    fireEvent.click(fullscreenButton);
    
    expect(defaultProps.onFullscreenToggle).toHaveBeenCalled();
  });

  it('shows refresh button when onRefresh provided', () => {
    const onRefresh = vi.fn();
    const { container } = render(<StreamControls {...defaultProps} onRefresh={onRefresh} />);
    
    expect(container.querySelector('.lucide-refresh-cw')).toBeInTheDocument();
  });

  it('shows snapshot button when onSnapshot provided', () => {
    const onSnapshot = vi.fn();
    const { container } = render(<StreamControls {...defaultProps} onSnapshot={onSnapshot} />);
    
    expect(container.querySelector('.lucide-camera')).toBeInTheDocument();
  });

  it('renders compact version', () => {
    const { container } = render(<StreamControls {...defaultProps} compact={true} />);
    
    // Compact version should have smaller buttons
    expect(container.querySelector('.h-7')).toBeInTheDocument();
  });
});
