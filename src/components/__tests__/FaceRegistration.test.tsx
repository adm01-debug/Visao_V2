import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FaceRegistration } from '../FaceRegistration';

describe('FaceRegistration', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders registration form', () => {
    render(<FaceRegistration onSubmit={mockOnSubmit} />);
    
    expect(screen.getByText('Cadastrar Pessoa')).toBeInTheDocument();
  });

  it('shows edit mode title when initialData is provided', () => {
    render(<FaceRegistration onSubmit={mockOnSubmit} initialData={{ name: 'Test' }} />);
    
    expect(screen.getByText('Editar Pessoa')).toBeInTheDocument();
  });

  it('shows all form fields', () => {
    render(<FaceRegistration onSubmit={mockOnSubmit} />);
    
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tipo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/departamento/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cargo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/observações/i)).toBeInTheDocument();
  });

  it('calls onSubmit with form data', async () => {
    render(<FaceRegistration onSubmit={mockOnSubmit} />);
    
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'João Silva' } });
    fireEvent.change(screen.getByLabelText(/departamento/i), { target: { value: 'TI' } });
    
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        name: 'João Silva',
        department: 'TI',
        listType: 'authorized',
      }));
    });
  });

  it('shows error when name is empty', async () => {
    render(<FaceRegistration onSubmit={mockOnSubmit} />);
    
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Nome é obrigatório')).toBeInTheDocument();
    });
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('shows cancel button when onCancel is provided', () => {
    const onCancel = vi.fn();
    render(<FaceRegistration onSubmit={mockOnSubmit} onCancel={onCancel} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelButton);
    
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(<FaceRegistration onSubmit={mockOnSubmit} isLoading={true} />);
    
    expect(screen.getByText('Salvando...')).toBeInTheDocument();
  });

  it('populates form with initial data', () => {
    render(
      <FaceRegistration 
        onSubmit={mockOnSubmit} 
        initialData={{
          name: 'Maria',
          department: 'RH',
          role: 'Gerente',
          notes: 'Notas teste',
        }}
      />
    );
    
    expect(screen.getByDisplayValue('Maria')).toBeInTheDocument();
    expect(screen.getByDisplayValue('RH')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Gerente')).toBeInTheDocument();
  });
});
