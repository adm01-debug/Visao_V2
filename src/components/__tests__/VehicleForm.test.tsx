import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VehicleForm } from '../VehicleForm';

describe('VehicleForm', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders vehicle form', () => {
    render(<VehicleForm onSubmit={mockOnSubmit} />);
    expect(screen.getByText('Cadastrar Veículo')).toBeInTheDocument();
  });

  it('shows edit mode when initialData provided', () => {
    render(<VehicleForm onSubmit={mockOnSubmit} initialData={{ plate: 'ABC1234' }} />);
    expect(screen.getByText('Editar Veículo')).toBeInTheDocument();
  });

  it('shows all form fields', () => {
    render(<VehicleForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByLabelText(/placa/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/proprietário/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/cor/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/observações/i)).toBeInTheDocument();
  });

  it('shows active toggle', () => {
    render(<VehicleForm onSubmit={mockOnSubmit} />);
    expect(screen.getByLabelText(/ativo/i)).toBeInTheDocument();
  });

  it('validates required plate field', async () => {
    render(<VehicleForm onSubmit={mockOnSubmit} />);
    
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Placa é obrigatória')).toBeInTheDocument();
    });
    
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('converts plate to uppercase', () => {
    render(<VehicleForm onSubmit={mockOnSubmit} />);
    
    const plateInput = screen.getByLabelText(/placa/i);
    fireEvent.change(plateInput, { target: { value: 'abc1234' } });
    
    expect(plateInput).toHaveValue('ABC1234');
  });

  it('calls onSubmit with form data', async () => {
    render(<VehicleForm onSubmit={mockOnSubmit} />);
    
    fireEvent.change(screen.getByLabelText(/placa/i), { target: { value: 'ABC1234' } });
    fireEvent.change(screen.getByLabelText(/proprietário/i), { target: { value: 'João' } });
    
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        plate: 'ABC1234',
        ownerName: 'João',
      }));
    });
  });

  it('shows cancel button when onCancel provided', () => {
    const onCancel = vi.fn();
    render(<VehicleForm onSubmit={mockOnSubmit} onCancel={onCancel} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelButton);
    
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(<VehicleForm onSubmit={mockOnSubmit} isLoading={true} />);
    expect(screen.getByText('Salvando...')).toBeInTheDocument();
  });

  it('populates form with initial data', () => {
    render(
      <VehicleForm 
        onSubmit={mockOnSubmit} 
        initialData={{
          plate: 'XYZ9999',
          ownerName: 'Maria',
          color: 'Preto',
        }}
      />
    );
    
    expect(screen.getByDisplayValue('XYZ9999')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Maria')).toBeInTheDocument();
  });
});
