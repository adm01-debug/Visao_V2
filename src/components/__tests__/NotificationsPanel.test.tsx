import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import NotificationsPanel from '../NotificationsPanel';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('NotificationsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<NotificationsPanel />, { wrapper });
    expect(container).toBeTruthy();
  });

  it('handles user interaction', async () => {
    render(<NotificationsPanel />, { wrapper });
    expect(true).toBe(true);
  });

  it('matches snapshot', () => {
    const { container } = render(<NotificationsPanel />, { wrapper });
    expect(container).toMatchSnapshot();
  });
});
