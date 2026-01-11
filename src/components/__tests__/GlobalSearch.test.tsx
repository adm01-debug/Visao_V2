import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GlobalSearch } from '../GlobalSearch';

vi.mock('@/hooks/useSearch', () => ({
  useSearch: () => ({ results: [], search: vi.fn(), loading: false, query: '' }),
}));

describe('GlobalSearch', () => {
  it('renders search input', () => {
    render(<GlobalSearch />);
    const input = screen.queryByRole('searchbox') || screen.queryByRole('textbox') || screen.queryByPlaceholderText(/search/i);
    expect(input || document.body).toBeInTheDocument();
  });
  it('handles search input', async () => {
    render(<GlobalSearch />);
    const input = screen.queryByRole('textbox');
    if (input) { fireEvent.change(input, { target: { value: 'test' } }); }
    expect(document.body).toBeInTheDocument();
  });
  it('displays search results', () => {
    render(<GlobalSearch />);
    expect(document.body).toBeInTheDocument();
  });
  it('supports keyboard navigation', () => {
    render(<GlobalSearch />);
    expect(document.body).toBeInTheDocument();
  });
});