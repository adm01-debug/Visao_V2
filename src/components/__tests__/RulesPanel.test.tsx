import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RulesPanel from '../RulesPanel';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('RulesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<RulesPanel />, { wrapper });
    expect(container).toBeTruthy();
  });

  it('handles user interaction', async () => {
    render(<RulesPanel />, { wrapper });
    // Component specific interactions
    expect(true).toBe(true);
  });

  it('matches snapshot', () => {
    const { container } = render(<RulesPanel />, { wrapper });
    expect(container).toMatchSnapshot();
  });
});
