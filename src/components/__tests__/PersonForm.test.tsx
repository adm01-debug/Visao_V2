import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PersonForm } from '../PersonForm';

describe('PersonForm', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders person form', () => {
    render(<PersonForm onSubmit={mockOnSubmit} />);
    expect(screen.getByText('Cadastrar Pessoa')).toBeInTheDocument();
  });

  it('shows edit mode when initialData provided', () => {
    render(<PersonForm onSubmit={mockOnSubmit} initialData={{ name: 'Test' }} />);
    expect(screen.getByText('Editar Pessoa')).toBeInTheDocument();
  });

  it('shows all form fields', () => {
    render(<PersonForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/departamento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cargo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/observações/i)).toBeInTheDocument();
  });

  it('shows active toggle', () => {
    render(<PersonForm onSubmit={mockOnSubmit} />);
    expect(screen.getByLabelText(/ativo/i)).toBeInTheDocument();
  });

  it('validates required name field', async () => {
    render(<PersonForm onSubmit={mockOnSubmit} />);
    
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Nome é obrigatório')).toBeInTheDocument();
    });
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('calls onSubmit with form data', async () => {
    render(<PersonForm onSubmit={mockOnSubmit} />);
    
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'João Silva' } });
    fireEvent.change(screen.getByLabelText(/departamento/i), { target: { value: 'TI' } });
    
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        name: 'João Silva',
        department: 'TI',
      }));
    });
  });

  it('shows cancel button when onCancel provided', () => {
    const onCancel = vi.fn();
    render(<PersonForm onSubmit={mockOnSubmit} onCancel={onCancel} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelButton);
    
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(<PersonForm onSubmit={mockOnSubmit} isLoading={true} />);
    expect(screen.getByText('Salvando...')).toBeInTheDocument();
  });

  it('populates form with initial data', () => {
    render(
      <PersonForm 
        onSubmit={mockOnSubmit} 
        initialData={{
          name: 'Maria',
          department: 'RH',
          role: 'Gerente',
        }}
      />
    );
    
    expect(screen.getByDisplayValue('Maria')).toBeInTheDocument();
    expect(screen.getByDisplayValue('RH')).toBeInTheDocument();
  });
});
