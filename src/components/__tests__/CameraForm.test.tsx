import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CameraForm } from '../CameraForm';

describe('CameraForm', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders camera form', () => {
    render(<CameraForm onSubmit={mockOnSubmit} />);
    expect(screen.getByText('Nova Câmera')).toBeInTheDocument();
  });

  it('shows edit mode title when initialData is provided', () => {
    render(<CameraForm onSubmit={mockOnSubmit} initialData={{ name: 'Test' }} />);
    expect(screen.getByText('Editar Câmera')).toBeInTheDocument();
  });

  it('shows all form fields', () => {
    render(<CameraForm onSubmit={mockOnSubmit} />);
    
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/localização/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/url do stream/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/status/i)).toBeInTheDocument();
  });

  it('calls onSubmit with form data', async () => {
    render(<CameraForm onSubmit={mockOnSubmit} />);
    
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Câmera Teste' } });
    fireEvent.change(screen.getByLabelText(/localização/i), { target: { value: 'Portaria' } });
    
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    
    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(expect.objectContaining({
        name: 'Câmera Teste',
        location: 'Portaria',
      }));
    });
  });

  it('shows error when name is empty', async () => {
    render(<CameraForm onSubmit={mockOnSubmit} />);
    
    fireEvent.change(screen.getByLabelText(/localização/i), { target: { value: 'Portaria' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Nome é obrigatório')).toBeInTheDocument();
    });
  });

  it('shows error when location is empty', async () => {
    render(<CameraForm onSubmit={mockOnSubmit} />);
    
    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: 'Câmera' } });
    fireEvent.click(screen.getByRole('button', { name: /salvar/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Localização é obrigatória')).toBeInTheDocument();
    });
  });

  it('shows cancel button when onCancel is provided', () => {
    const onCancel = vi.fn();
    render(<CameraForm onSubmit={mockOnSubmit} onCancel={onCancel} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    fireEvent.click(cancelButton);
    
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows loading state', () => {
    render(<CameraForm onSubmit={mockOnSubmit} isLoading={true} />);
    expect(screen.getByText('Salvando...')).toBeInTheDocument();
  });

  it('populates form with initial data', () => {
    render(
      <CameraForm 
        onSubmit={mockOnSubmit} 
        initialData={{
          name: 'Câmera Entrada',
          location: 'Portaria Principal',
          streamUrl: 'rtsp://camera.local',
        }}
      />
    );
    
    expect(screen.getByDisplayValue('Câmera Entrada')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Portaria Principal')).toBeInTheDocument();
  });
});
