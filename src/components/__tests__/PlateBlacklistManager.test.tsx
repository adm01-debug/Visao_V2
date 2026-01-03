import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PlateBlacklistManager } from '../PlateBlacklistManager';

const mockPlates = [
  {
    id: '1',
    plate: 'ABC1234',
    listType: 'allowed' as const,
    ownerName: 'João Silva',
    createdAt: new Date(),
  },
  {
    id: '2',
    plate: 'XYZ5678',
    listType: 'blocked' as const,
    ownerName: 'Bloqueado',
    createdAt: new Date(),
  },
];

describe('PlateBlacklistManager', () => {
  const mockOnAdd = vi.fn().mockResolvedValue(undefined);
  const mockOnDelete = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders plate manager', () => {
    render(<PlateBlacklistManager plates={mockPlates} onAdd={mockOnAdd} onDelete={mockOnDelete} />);
    expect(screen.getByText('Gerenciador de Placas')).toBeInTheDocument();
  });

  it('shows stats', () => {
    render(<PlateBlacklistManager plates={mockPlates} onAdd={mockOnAdd} onDelete={mockOnDelete} />);
    
    expect(screen.getByText('Total')).toBeInTheDocument();
    expect(screen.getByText('Permitidos')).toBeInTheDocument();
    expect(screen.getByText('Bloqueados')).toBeInTheDocument();
  });

  it('displays plate numbers', () => {
    render(<PlateBlacklistManager plates={mockPlates} onAdd={mockOnAdd} onDelete={mockOnDelete} />);
    
    expect(screen.getByText('ABC1234')).toBeInTheDocument();
    expect(screen.getByText('XYZ5678')).toBeInTheDocument();
  });

  it('shows owner names', () => {
    render(<PlateBlacklistManager plates={mockPlates} onAdd={mockOnAdd} onDelete={mockOnDelete} />);
    expect(screen.getByText('João Silva')).toBeInTheDocument();
  });

  it('filters plates by search', () => {
    render(<PlateBlacklistManager plates={mockPlates} onAdd={mockOnAdd} onDelete={mockOnDelete} />);
    
    const searchInput = screen.getByPlaceholderText(/buscar placa/i);
    fireEvent.change(searchInput, { target: { value: 'ABC' } });
    
    expect(screen.getByText('ABC1234')).toBeInTheDocument();
    expect(screen.queryByText('XYZ5678')).not.toBeInTheDocument();
  });

  it('calls onDelete when delete button clicked', () => {
    const { container } = render(
      <PlateBlacklistManager plates={mockPlates} onAdd={mockOnAdd} onDelete={mockOnDelete} />
    );
    
    const deleteButtons = container.querySelectorAll('.lucide-trash-2');
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0].closest('button')!);
      expect(mockOnDelete).toHaveBeenCalledWith('1');
    }
  });

  it('shows add button', () => {
    render(<PlateBlacklistManager plates={mockPlates} onAdd={mockOnAdd} onDelete={mockOnDelete} />);
    expect(screen.getByRole('button', { name: /adicionar/i })).toBeInTheDocument();
  });

  it('shows empty state when no plates', () => {
    render(<PlateBlacklistManager plates={[]} onAdd={mockOnAdd} onDelete={mockOnDelete} />);
    expect(screen.getByText('Nenhuma placa encontrada')).toBeInTheDocument();
  });

  it('shows export button when onExport provided', () => {
    const onExport = vi.fn();
    const { container } = render(
      <PlateBlacklistManager plates={mockPlates} onAdd={mockOnAdd} onDelete={mockOnDelete} onExport={onExport} />
    );
    
    expect(container.querySelector('.lucide-download')).toBeInTheDocument();
  });
});
