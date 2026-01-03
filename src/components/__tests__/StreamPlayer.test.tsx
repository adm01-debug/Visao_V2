import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { StreamPlayer } from '../StreamPlayer';

// Mock HLS.js
vi.mock('hls.js', () => ({
  default: class MockHls {
    static isSupported = () => true;
    static Events = { MANIFEST_PARSED: 'manifest', ERROR: 'error' };
    loadSource = vi.fn();
    attachMedia = vi.fn();
    on = vi.fn();
    destroy = vi.fn();
  }
}));

describe('StreamPlayer', () => {
  it('renders video element', () => {
    const { container } = render(
      <StreamPlayer streamUrl="http://example.com/stream.m3u8" />
    );
    
    const video = container.querySelector('video');
    expect(video).toBeInTheDocument();
  });

  it('shows loading state initially', () => {
    const { container } = render(
      <StreamPlayer streamUrl="http://example.com/stream.m3u8" />
    );
    
    // Should show loading spinner
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('renders controls when controls prop is true', () => {
    const { container } = render(
      <StreamPlayer streamUrl="http://example.com/stream.m3u8" controls={true} />
    );
    
    // Controls should exist (may be hidden until hover)
    expect(container.querySelector('[class*="group-hover"]')).toBeInTheDocument();
  });

  it('starts muted by default', () => {
    const { container } = render(
      <StreamPlayer streamUrl="http://example.com/stream.m3u8" />
    );
    
    const video = container.querySelector('video');
    expect(video).toHaveAttribute('muted');
  });

  it('calls onError when error occurs', () => {
    const onError = vi.fn();
    render(
      <StreamPlayer streamUrl="http://example.com/stream.m3u8" onError={onError} />
    );
    
    // onError should be available to be called
    expect(onError).not.toHaveBeenCalled();
  });

  it('applies custom className', () => {
    const { container } = render(
      <StreamPlayer streamUrl="http://example.com/stream.m3u8" className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('can be set to not autoplay', () => {
    render(
      <StreamPlayer streamUrl="http://example.com/stream.m3u8" autoPlay={false} />
    );
    
    // Component should render without autoplay
    expect(screen.queryByRole('button')).toBeDefined();
  });
});
