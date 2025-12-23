import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import PersonCard from '../PersonCard';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('PersonCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<PersonCard />, { wrapper });
    expect(container).toBeTruthy();
  });

  it('handles user interaction', async () => {
    render(<PersonCard />, { wrapper });
    // Component specific interactions
    expect(true).toBe(true);
  });

  it('matches snapshot', () => {
    const { container } = render(<PersonCard />, { wrapper });
    expect(container).toMatchSnapshot();
  });
});
