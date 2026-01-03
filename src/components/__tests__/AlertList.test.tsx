import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertList } from '../AlertList';

const mockAlerts = [
  {
    id: '1',
    cameraId: 'cam-1',
    cameraName: 'Câmera Entrada',
    type: 'security' as const,
    severity: 'high' as const,
    message: 'Movimento detectado',
    timestamp: new Date('2024-01-15T10:30:00'),
    isRead: false,
  },
  {
    id: '2',
    cameraId: 'cam-2',
    cameraName: 'Câmera Saída',
    type: 'safety' as const,
    severity: 'medium' as const,
    message: 'EPI não detectado',
    timestamp: new Date('2024-01-15T09:00:00'),
    isRead: true,
  },
];

describe('AlertList', () => {
  it('renders alerts header', () => {
    render(<AlertList alerts={mockAlerts} />);
    expect(screen.getByText('Alertas')).toBeInTheDocument();
  });

  it('shows unread count badge', () => {
    render(<AlertList alerts={mockAlerts} />);
    expect(screen.getByText('1')).toBeInTheDocument();
  });

  it('shows mark all read button when there are unread alerts', () => {
    const onMarkAllRead = vi.fn();
    render(<AlertList alerts={mockAlerts} onMarkAllRead={onMarkAllRead} />);
    
    const button = screen.getByRole('button', { name: /marcar todas lidas/i });
    expect(button).toBeInTheDocument();
    
    fireEvent.click(button);
    expect(onMarkAllRead).toHaveBeenCalled();
  });

  it('calls onAlertClick when alert is clicked', () => {
    const onAlertClick = vi.fn();
    render(<AlertList alerts={mockAlerts} onAlertClick={onAlertClick} />);
    
    fireEvent.click(screen.getByText('Movimento detectado'));
    expect(onAlertClick).toHaveBeenCalledWith(mockAlerts[0]);
  });

  it('shows empty state when no alerts', () => {
    render(<AlertList alerts={[]} />);
    expect(screen.getByText('Nenhum alerta encontrado')).toBeInTheDocument();
  });

  it('shows custom empty message', () => {
    render(<AlertList alerts={[]} emptyMessage="Sem alertas hoje" />);
    expect(screen.getByText('Sem alertas hoje')).toBeInTheDocument();
  });

  it('passes searchQuery to AlertCard', () => {
    render(<AlertList alerts={mockAlerts} searchQuery="Movimento" />);
    // AlertCard should receive and use the searchQuery
    expect(screen.getByText('Movimento detectado')).toBeInTheDocument();
  });
});
