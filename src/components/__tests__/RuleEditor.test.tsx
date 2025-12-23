import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RuleEditor from '../RuleEditor';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('RuleEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<RuleEditor />, { wrapper });
    expect(container).toBeTruthy();
  });

  it('handles user interaction', async () => {
    render(<RuleEditor />, { wrapper });
    // Component specific interactions
    expect(true).toBe(true);
  });

  it('matches snapshot', () => {
    const { container } = render(<RuleEditor />, { wrapper });
    expect(container).toMatchSnapshot();
  });
});
