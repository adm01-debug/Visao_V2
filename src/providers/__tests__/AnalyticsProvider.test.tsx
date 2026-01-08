import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnalyticsProvider, useAnalytics } from '@/providers/AnalyticsProvider';

// Mock analytics
vi.mock('@/lib/analytics', () => ({
  initAnalytics: vi.fn(),
  trackEvent: vi.fn(),
}));

const TestComponent = () => {
  const { track } = useAnalytics();
  return <button onClick={() => track('click')}>Track</button>;
};

describe('AnalyticsProvider', () => {
  it('renders children', () => {
    render(<AnalyticsProvider><div>Content</div></AnalyticsProvider>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('provides analytics context with track function', () => {
    render(<AnalyticsProvider><TestComponent /></AnalyticsProvider>);
    expect(screen.getByRole('button')).toBeInTheDocument();
    
    fireEvent.click(screen.getByRole('button'));
    // Track function should be called without errors
  });
});
