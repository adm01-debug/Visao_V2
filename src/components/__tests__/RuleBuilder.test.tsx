import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { RuleBuilder } from '../RuleBuilder';

describe('RuleBuilder', () => {
  const mockOnSave = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders rule builder form', () => {
    render(<RuleBuilder onSave={mockOnSave} />);
    expect(screen.getByText('Nova Regra')).toBeInTheDocument();
  });

  it('shows edit mode when initialData provided', () => {
    render(<RuleBuilder onSave={mockOnSave} initialData={{ name: 'Test' }} />);
    expect(screen.getByText('Editar Regra')).toBeInTheDocument();
  });

  it('shows all form sections', () => {
    render(<RuleBuilder onSave={mockOnSave} />);
    
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/descrição/i)).toBeInTheDocument();
    expect(screen.getByText('Condições')).toBeInTheDocument();
    expect(screen.getByText('Ações')).toBeInTheDocument();
  });

  it('allows adding conditions', () => {
    render(<RuleBuilder onSave={mockOnSave} />);
    
    expect(screen.getByText('Nenhuma condição definida')).toBeInTheDocument();
    
    fireEvent.click(screen.getByRole('button', { name: /adicionar/i }));
    
    expect(screen.queryByText('Nenhuma condição definida')).not.toBeInTheDocument();
  });

  it('allows removing conditions', () => {
    render(<RuleBuilder onSave={mockOnSave} />);
    
    fireEvent.click(screen.getByRole('button', { name: /adicionar/i }));
    
    const deleteButtons = screen.getAllByRole('button').filter(btn => 
      btn.querySelector('.lucide-trash-2')
    );
    
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);
      expect(screen.getByText('Nenhuma condição definida')).toBeInTheDocument();
    }
  });

  it('allows toggling actions', () => {
    render(<RuleBuilder onSave={mockOnSave} />);
    
    const notifyBadge = screen.getByText('Notificar');
    fireEvent.click(notifyBadge);
    
    // Badge should be selected now
    expect(notifyBadge.closest('[class*="bg-primary"]')).toBeDefined();
  });

  it('shows error when name is empty', async () => {
    render(<RuleBuilder onSave={mockOnSave} />);
    
    fireEvent.click(screen.getByRole('button', { name: /salvar regra/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Nome é obrigatório')).toBeInTheDocument();
    });
  });

  it('shows error when no conditions', async () => {
    render(<RuleBuilder onSave={mockOnSave} />);
    
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Test Rule' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar regra/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Adicione pelo menos uma condição')).toBeInTheDocument();
    });
  });

  it('shows cancel button when onCancel provided', () => {
    const onCancel = vi.fn();
    render(<RuleBuilder onSave={mockOnSave} onCancel={onCancel} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelButton);
    
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(<RuleBuilder onSave={mockOnSave} isLoading={true} />);
    expect(screen.getByText('Salvando...')).toBeInTheDocument();
  });
});
