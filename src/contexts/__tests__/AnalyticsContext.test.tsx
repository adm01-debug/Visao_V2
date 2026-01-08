import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AnalyticsProvider, useAnalytics } from '../AnalyticsContext';

function TestComponent() {
  const { dateRange, selectedCameras } = useAnalytics();
  return (
    <div>
      <span data-testid="start">{dateRange.start.toISOString()}</span>
      <span data-testid="cameras">{selectedCameras.length}</span>
    </div>
  );
}

describe('AnalyticsContext', () => {
  it('provides analytics context with dateRange', () => {
    render(
      <AnalyticsProvider>
        <TestComponent />
      </AnalyticsProvider>
    );
    expect(screen.getByTestId('start')).toBeInTheDocument();
  });

  it('initializes with empty cameras array', () => {
    render(
      <AnalyticsProvider>
        <TestComponent />
      </AnalyticsProvider>
    );
    expect(screen.getByTestId('cameras')).toHaveTextContent('0');
  });

  it('throws error when used outside provider', () => {
    expect(() => {
      render(<TestComponent />);
    }).toThrow('useAnalytics must be used within AnalyticsProvider');
  });
});
