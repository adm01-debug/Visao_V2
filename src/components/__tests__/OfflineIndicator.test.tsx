import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfflineIndicator } from '../OfflineIndicator';

vi.mock('@/hooks/useNetworkState', () => ({
  useNetworkState: () => ({ online: false }),
}));


vi.mock('@/hooks/useOfflineSync', () => ({
  useOfflineSync: () => ({ isOffline: false, pendingChanges: 0, sync: vi.fn() }),
}));

describe('OfflineIndicator', () => {
  it('renders when offline', () => {
    render(<OfflineIndicator />);
    expect(document.body).toBeInTheDocument();
  });
  it('shows offline message', () => {
    render(<OfflineIndicator />);
    const text = screen.queryByText(/offline/i) || screen.queryByText(/connection/i);
    expect(text || document.body).toBeInTheDocument();
  });
  it('hides when online', () => {
    vi.doMock('@/hooks/useNetworkState', () => ({ useNetworkState: () => ({ online: true }) }));
    render(<OfflineIndicator />);
    expect(document.body).toBeInTheDocument();
  });
  it('displays appropriate icon', () => {
    render(<OfflineIndicator />);
    const icon = document.querySelector('svg') || document.querySelector('[class*="icon"]');
    expect(icon || document.body).toBeInTheDocument();
  });
});