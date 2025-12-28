import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AudioPlayer from '@/components/AudioPlayer';

describe('AudioPlayer', () => {
  beforeEach(() => {
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    HTMLMediaElement.prototype.pause = vi.fn();
  });

  it('renders play button', () => {
    render(<AudioPlayer src="test.mp3" />);
    expect(screen.getByRole('button', { name: /play/i })).toBeInTheDocument();
  });

  it('toggles play on click', () => {
    render(<AudioPlayer src="test.mp3" />);
    fireEvent.click(screen.getByRole('button', { name: /play/i }));
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it('shows volume control when enabled', () => {
    render(<AudioPlayer src="test.mp3" showVolumeControl />);
    expect(screen.getByRole('slider')).toBeInTheDocument();
  });

  it('displays progress bar', () => {
    render(<AudioPlayer src="test.mp3" />);
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });
});
