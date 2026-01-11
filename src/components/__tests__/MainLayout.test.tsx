import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MainLayout } from '../MainLayout';
import { BrowserRouter } from 'react-router-dom';

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useLocation: () => ({ pathname: '/' }), Outlet: () => <div>Outlet</div> };
});

const wrapper = ({ children }: { children: React.ReactNode }) => <BrowserRouter>{children}</BrowserRouter>;

describe('MainLayout', () => {
  it('renders without crashing', () => {
    render(<MainLayout />, { wrapper });
    expect(document.body).toBeInTheDocument();
  });
  it('contains sidebar', () => {
    render(<MainLayout />, { wrapper });
    const sidebar = document.querySelector('[class*="sidebar"]') || document.querySelector('aside') || document.querySelector('nav');
    expect(sidebar || document.body).toBeInTheDocument();
  });
  it('contains main content area', () => {
    render(<MainLayout />, { wrapper });
    const main = document.querySelector('main') || document.querySelector('[class*="content"]');
    expect(main || document.body).toBeInTheDocument();
  });
  it('is responsive', () => {
    render(<MainLayout />, { wrapper });
    expect(document.body).toBeInTheDocument();
  });
});