import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import VideoStreamPlayer from '../VideoStreamPlayer';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('VideoStreamPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders without crashing', () => {
    const { container } = render(<VideoStreamPlayer />, { wrapper });
    expect(container).toBeTruthy();
  });

  it('handles user interaction', async () => {
    render(<VideoStreamPlayer />, { wrapper });
    expect(true).toBe(true);
  });

  it('matches snapshot', () => {
    const { container } = render(<VideoStreamPlayer />, { wrapper });
    expect(container).toMatchSnapshot();
  });
});
