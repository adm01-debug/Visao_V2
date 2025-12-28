import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AddressAutocomplete from '@/components/AddressAutocomplete';

vi.mock('@/services/geocodingService', () => ({
  searchAddress: vi.fn().mockResolvedValue([{ id: '1', description: 'Rua Teste, 123' }]),
}));

describe('AddressAutocomplete', () => {
  const mockOnSelect = vi.fn();
  beforeEach(() => vi.clearAllMocks());

  it('renders input field', () => {
    render(<AddressAutocomplete onSelect={mockOnSelect} />);
    expect(screen.getByPlaceholderText(/endereço/i)).toBeInTheDocument();
  });

  it('shows suggestions on input', async () => {
    render(<AddressAutocomplete onSelect={mockOnSelect} />);
    fireEvent.change(screen.getByPlaceholderText(/endereço/i), { target: { value: 'Rua' } });
    await waitFor(() => expect(screen.getByText('Rua Teste, 123')).toBeInTheDocument());
  });

  it('calls onSelect when suggestion clicked', async () => {
    render(<AddressAutocomplete onSelect={mockOnSelect} />);
    fireEvent.change(screen.getByPlaceholderText(/endereço/i), { target: { value: 'Rua' } });
    await waitFor(() => fireEvent.click(screen.getByText('Rua Teste, 123')));
    expect(mockOnSelect).toHaveBeenCalled();
  });
});
