import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FaceEnrollment } from '../FaceEnrollment';

describe('FaceEnrollment', () => {
  const mockOnEnroll = vi.fn().mockResolvedValue(undefined);

  it('renders enrollment form', () => {
    render(<FaceEnrollment onEnroll={mockOnEnroll} />);
    
    expect(screen.getByText('Cadastro Facial')).toBeInTheDocument();
    expect(screen.getByText('Usar Câmera')).toBeInTheDocument();
    expect(screen.getByText('Upload')).toBeInTheDocument();
  });

  it('shows name input field', () => {
    render(<FaceEnrollment onEnroll={mockOnEnroll} />);
    
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Nome completo')).toBeInTheDocument();
  });

  it('shows optional department field', () => {
    render(<FaceEnrollment onEnroll={mockOnEnroll} />);
    
    expect(screen.getByLabelText(/departamento/i)).toBeInTheDocument();
  });

  it('shows optional notes field', () => {
    render(<FaceEnrollment onEnroll={mockOnEnroll} />);
    
    expect(screen.getByLabelText(/observações/i)).toBeInTheDocument();
  });

  it('disables submit when name is empty', () => {
    render(<FaceEnrollment onEnroll={mockOnEnroll} />);
    
    const submitButton = screen.getByRole('button', { name: /cadastrar/i });
    expect(submitButton).toBeDisabled();
  });

  it('shows cancel button when onCancel is provided', () => {
    const onCancel = vi.fn();
    render(<FaceEnrollment onEnroll={mockOnEnroll} onCancel={onCancel} />);
    
    const cancelButton = screen.getByRole('button', { name: /cancelar/i });
    expect(cancelButton).toBeInTheDocument();
    
    fireEvent.click(cancelButton);
    expect(onCancel).toHaveBeenCalled();
  });

  it('shows processing state', () => {
    render(<FaceEnrollment onEnroll={mockOnEnroll} isProcessing={true} />);
    
    expect(screen.getByText('Processando...')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <FaceEnrollment onEnroll={mockOnEnroll} className="custom-class" />
    );
    
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
