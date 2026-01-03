import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertHistory } from '../AlertHistory';

const mockAlerts = [
  {
    id: '1',
    type: 'security' as const,
    severity: 'critical' as const,
    message: 'Intrusão detectada',
    cameraName: 'Câmera 1',
    timestamp: new Date('2024-01-15T10:30:00'),
    isRead: false,
  },
  {
    id: '2',
    type: 'safety' as const,
    severity: 'medium' as const,
    message: 'EPI não detectado',
    cameraName: 'Câmera 2',
    timestamp: new Date('2024-01-15T09:00:00'),
    isRead: true,
  },
  {
    id: '3',
    type: 'access' as const,
    severity: 'low' as const,
    message: 'Acesso autorizado',
    cameraName: 'Câmera 3',
    timestamp: new Date('2024-01-15T08:00:00'),
    isRead: true,
  },
];

describe('AlertHistory', () => {
  it('renders alert history title', () => {
    render(<AlertHistory alerts={mockAlerts} />);
    expect(screen.getByText('Histórico de Alertas')).toBeInTheDocument();
  });

  it('displays all alerts', () => {
    render(<AlertHistory alerts={mockAlerts} />);
    
    expect(screen.getByText('Intrusão detectada')).toBeInTheDocument();
    expect(screen.getByText('EPI não detectado')).toBeInTheDocument();
    expect(screen.getByText('Acesso autorizado')).toBeInTheDocument();
  });

  it('filters alerts by search query', () => {
    render(<AlertHistory alerts={mockAlerts} />);
    
    const searchInput = screen.getByPlaceholderText('Buscar alertas...');
    fireEvent.change(searchInput, { target: { value: 'Intrusão' } });
    
    expect(screen.getByText('Intrusão detectada')).toBeInTheDocument();
    expect(screen.queryByText('EPI não detectado')).not.toBeInTheDocument();
  });

  it('calls onAlertClick when alert is clicked', () => {
    const onAlertClick = vi.fn();
    render(<AlertHistory alerts={mockAlerts} onAlertClick={onAlertClick} />);
    
    fireEvent.click(screen.getByText('Intrusão detectada'));
    expect(onAlertClick).toHaveBeenCalledWith(mockAlerts[0]);
  });

  it('shows export button when onExport is provided', () => {
    const onExport = vi.fn();
    render(<AlertHistory alerts={mockAlerts} onExport={onExport} />);
    
    const exportButton = screen.getByRole('button', { name: /exportar/i });
    expect(exportButton).toBeInTheDocument();
    
    fireEvent.click(exportButton);
    expect(onExport).toHaveBeenCalled();
  });

  it('shows empty state when no alerts', () => {
    render(<AlertHistory alerts={[]} />);
    expect(screen.getByText('Nenhum alerta encontrado')).toBeInTheDocument();
  });

  it('paginates alerts correctly', () => {
    const manyAlerts = Array.from({ length: 25 }, (_, i) => ({
      id: String(i),
      type: 'security' as const,
      severity: 'low' as const,
      message: `Alerta ${i}`,
      cameraName: `Câmera ${i}`,
      timestamp: new Date(),
      isRead: true,
    }));
    
    render(<AlertHistory alerts={manyAlerts} itemsPerPage={10} />);
    
    expect(screen.getByText('1 / 3')).toBeInTheDocument();
  });
});
