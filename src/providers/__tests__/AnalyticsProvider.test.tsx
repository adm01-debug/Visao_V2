import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AnalyticsProvider, useAnalytics } from '@/providers/AnalyticsProvider';

const TestComponent = () => {
  const { track } = useAnalytics();
  return <button onClick={() => track('test_event')}>Track</button>;
};

describe('AnalyticsProvider', () => {
  it('renders children', () => {
    render(<AnalyticsProvider><div>Child</div></AnalyticsProvider>);
    expect(screen.getByText('Child')).toBeInTheDocument();
  });

  it('provides analytics context', () => {
    render(<AnalyticsProvider><TestComponent /></AnalyticsProvider>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('track function is callable', () => {
    const { getByRole } = render(<AnalyticsProvider><TestComponent /></AnalyticsProvider>);
    expect(() => getByRole('button').click()).not.toThrow();
  });
});
