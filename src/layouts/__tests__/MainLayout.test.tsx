import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MainLayout } from '../MainLayout';

vi.mock('@/components/Sidebar', () => ({ Sidebar: () => <aside data-testid="sidebar" /> }));
vi.mock('@/components/Header', () => ({ Header: () => <header data-testid="header" /> }));
vi.mock('@/components/BottomNavigation', () => ({
  BottomNavigation: () => <nav data-testid="bottom-nav" />,
}));
vi.mock('@/components/SwipeableView', () => ({
  SwipeableView: ({ children, ...rest }: { children: React.ReactNode }) => (
    <div {...rest}>{children}</div>
  ),
}));
vi.mock('@/components/PWAMigrationBanner', () => ({ PWAMigrationBanner: () => null }));

describe('MainLayout', () => {
  it('renders shell chrome around children', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <MemoryRouter>
          <MainLayout>
            <p>content-slot</p>
          </MainLayout>
        </MemoryRouter>
      </QueryClientProvider>
    );
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('bottom-nav')).toBeInTheDocument();
    expect(screen.getByText('content-slot')).toBeInTheDocument();
  });
});
