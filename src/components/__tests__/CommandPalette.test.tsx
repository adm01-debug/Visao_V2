import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CommandPalette from '@/components/CommandPalette';

const mockCommands = [
  { id: '1', name: 'Salvar', shortcut: 'Ctrl+S', action: vi.fn() },
  { id: '2', name: 'Abrir', shortcut: 'Ctrl+O', action: vi.fn() },
];

describe('CommandPalette', () => {
  it('renders when open', () => {
    render(<CommandPalette isOpen commands={mockCommands} onClose={vi.fn()} />);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<CommandPalette isOpen={false} commands={mockCommands} onClose={vi.fn()} />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('displays commands list', () => {
    render(<CommandPalette isOpen commands={mockCommands} onClose={vi.fn()} />);
    expect(screen.getByText('Salvar')).toBeInTheDocument();
    expect(screen.getByText('Abrir')).toBeInTheDocument();
  });

  it('filters commands on search', async () => {
    render(<CommandPalette isOpen commands={mockCommands} onClose={vi.fn()} />);
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Salvar' } });
    await waitFor(() => {
      expect(screen.getByText('Salvar')).toBeInTheDocument();
      expect(screen.queryByText('Abrir')).not.toBeInTheDocument();
    });
  });

  it('executes command on click', () => {
    render(<CommandPalette isOpen commands={mockCommands} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText('Salvar'));
    expect(mockCommands[0].action).toHaveBeenCalled();
  });

  it('shows keyboard shortcuts', () => {
    render(<CommandPalette isOpen commands={mockCommands} onClose={vi.fn()} />);
    expect(screen.getByText('Ctrl+S')).toBeInTheDocument();
  });
});
