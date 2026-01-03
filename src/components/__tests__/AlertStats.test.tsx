import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AlertStats } from '../AlertStats';

const mockAlerts = [
  { id: '1', type: 'security' as const, severity: 'critical' as const, isRead: false, timestamp: new Date() },
  { id: '2', type: 'security' as const, severity: 'high' as const, isRead: false, timestamp: new Date() },
  { id: '3', type: 'safety' as const, severity: 'medium' as const, isRead: true, timestamp: new Date() },
  { id: '4', type: 'operations' as const, severity: 'low' as const, isRead: true, timestamp: new Date() },
  { id: '5', type: 'access' as const, severity: 'high' as const, isRead: true, timestamp: new Date() },
];

describe('AlertStats', () => {
  it('renders statistics title', () => {
    render(<AlertStats alerts={mockAlerts} />);
    expect(screen.getByText('Estatísticas de Alertas')).toBeInTheDocument();
  });

  it('displays total alert count', () => {
    render(<AlertStats alerts={mockAlerts} />);
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('displays unread count', () => {
    render(<AlertStats alerts={mockAlerts} />);
    expect(screen.getByText('2')).toBeInTheDocument(); // 2 unread alerts
  });

  it('shows severity breakdown', () => {
    render(<AlertStats alerts={mockAlerts} />);
    
    expect(screen.getByText('Crítica')).toBeInTheDocument();
    expect(screen.getByText('Alta')).toBeInTheDocument();
    expect(screen.getByText('Média')).toBeInTheDocument();
    expect(screen.getByText('Baixa')).toBeInTheDocument();
  });

  it('shows type breakdown', () => {
    render(<AlertStats alerts={mockAlerts} />);
    
    expect(screen.getByText('Segurança')).toBeInTheDocument();
    expect(screen.getByText('Trabalho')).toBeInTheDocument();
    expect(screen.getByText('Operações')).toBeInTheDocument();
    expect(screen.getByText('Acesso')).toBeInTheDocument();
  });

  it('calculates trends when previous period data is provided', () => {
    const previousAlerts = [
      { id: '1', type: 'security' as const, severity: 'low' as const, isRead: true, timestamp: new Date() },
      { id: '2', type: 'security' as const, severity: 'low' as const, isRead: true, timestamp: new Date() },
    ];
    
    render(<AlertStats alerts={mockAlerts} previousPeriodAlerts={previousAlerts} />);
    
    // Should show trend indicators
    expect(screen.getByText('Total')).toBeInTheDocument();
  });

  it('handles empty alerts array', () => {
    render(<AlertStats alerts={[]} />);
    
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<AlertStats alerts={mockAlerts} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
