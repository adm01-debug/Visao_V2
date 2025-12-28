import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnalyticsProvider, useAnalytics } from '@/providers/AnalyticsProvider';

const TestComponent = () => {
  const { track } = useAnalytics();
  return <button onClick={() => track('click')}>Track</button>;
};

describe('AnalyticsProvider', () => {
  it('renders children', () => {
    render(<AnalyticsProvider><div>Content</div></AnalyticsProvider>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('provides analytics context', () => {
    render(<AnalyticsProvider><TestComponent /></AnalyticsProvider>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });
});
