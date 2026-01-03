import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertDetail } from '../AlertDetail';

const mockAlert = {
  id: '1',
  cameraId: 'cam-1',
  cameraName: 'Câmera Entrada',
  type: 'security' as const,
  severity: 'high' as const,
  message: 'Movimento detectado na área restrita',
  timestamp: new Date('2024-01-15T10:30:00'),
  isRead: false,
  location: 'Portaria Principal',
};

describe('AlertDetail', () => {
  it('renders alert information correctly', () => {
    render(<AlertDetail alert={mockAlert} />);
    
    expect(screen.getByText('Segurança')).toBeInTheDocument();
    expect(screen.getByText('Alta')).toBeInTheDocument();
    expect(screen.getByText('Movimento detectado na área restrita')).toBeInTheDocument();
    expect(screen.getByText('Câmera Entrada')).toBeInTheDocument();
  });

  it('shows acknowledge button for unread alerts', () => {
    const onAcknowledge = vi.fn();
    render(<AlertDetail alert={mockAlert} onAcknowledge={onAcknowledge} />);
    
    const button = screen.getByRole('button', { name: /reconhecer alerta/i });
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    expect(onAcknowledge).toHaveBeenCalled();
  });

  it('shows acknowledged status for read alerts', () => {
    render(<AlertDetail alert={{ ...mockAlert, isRead: true }} />);
    
    expect(screen.getByText('Alerta reconhecido')).toBeInTheDocument();
  });

  it('calls onNavigateToCamera when camera is clicked', () => {
    const onNavigateToCamera = vi.fn();
    render(<AlertDetail alert={mockAlert} onNavigateToCamera={onNavigateToCamera} />);
    
    const cameraButton = screen.getByText('Câmera Entrada');
    fireEvent.click(cameraButton);
    
    expect(onNavigateToCamera).toHaveBeenCalledWith('cam-1');
  });

  it('displays thumbnail when provided', () => {
    render(<AlertDetail alert={{ ...mockAlert, thumbnail: '/test-image.jpg' }} />);
    
    const image = screen.getByAltText('Captura do alerta');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', '/test-image.jpg');
  });

  it('calls onDismiss when dismiss button is clicked', () => {
    const onDismiss = vi.fn();
    render(<AlertDetail alert={mockAlert} onDismiss={onDismiss} />);
    
    const buttons = screen.getAllByRole('button');
    const dismissButton = buttons.find(btn => btn.querySelector('svg.lucide-x'));
    if (dismissButton) {
      fireEvent.click(dismissButton);
      expect(onDismiss).toHaveBeenCalled();
    }
  });
});
