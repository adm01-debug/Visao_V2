import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <BrowserRouter>{children}</BrowserRouter>
  </QueryClientProvider>
);

describe('Dashboard', () => {
  it('should render', () => {
    render(<Dashboard />, { wrapper });
    expect(document.body).toBeDefined();
  });
});
