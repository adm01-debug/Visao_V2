import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AutomationRulesPage } from '../AutomationRulesPage';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: [], error: null }),
    })),
  },
}));

const renderPage = () => render(
  <BrowserRouter>
    <AutomationRulesPage />
  </BrowserRouter>
);

describe('AutomationRulesPage', () => {
  it('renders page title', () => {
    renderPage();
    expect(screen.getByText(/automation/i)).toBeInTheDocument();
  });

  it('shows create rule button', () => {
    renderPage();
    expect(screen.getByRole('button', { name: /create|add|new/i })).toBeInTheDocument();
  });

  it('displays rules list', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('rules-list')).toBeInTheDocument();
    });
  });

  it('opens create modal on button click', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /create|add|new/i }));
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });
});
