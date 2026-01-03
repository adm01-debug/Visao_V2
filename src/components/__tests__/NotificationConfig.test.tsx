import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationConfig } from '../NotificationConfig';

const mockConfig = {
  email: { enabled: true, recipients: ['test@example.com'] },
  push: { enabled: true, sound: true },
  sms: { enabled: false, recipients: [] },
  telegram: { enabled: false, chatId: '' },
  webhook: { enabled: false, urls: [] },
  severityFilter: ['high', 'critical'] as ('low' | 'medium' | 'high' | 'critical')[],
};

describe('NotificationConfig', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders notification config', () => {
    render(<NotificationConfig config={mockConfig} onChange={mockOnChange} />);
    expect(screen.getByText('Configurações de Notificação')).toBeInTheDocument();
  });

  it('shows severity filter badges', () => {
    render(<NotificationConfig config={mockConfig} onChange={mockOnChange} />);
    
    expect(screen.getByText('Baixa')).toBeInTheDocument();
    expect(screen.getByText('Média')).toBeInTheDocument();
    expect(screen.getByText('Alta')).toBeInTheDocument();
    expect(screen.getByText('Crítica')).toBeInTheDocument();
  });

  it('toggles severity filter', () => {
    render(<NotificationConfig config={mockConfig} onChange={mockOnChange} />);
    
    fireEvent.click(screen.getByText('Baixa'));
    
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      severityFilter: ['high', 'critical', 'low'],
    }));
  });

  it('shows email recipients', () => {
    render(<NotificationConfig config={mockConfig} onChange={mockOnChange} />);
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  it('toggles push notifications', () => {
    render(<NotificationConfig config={mockConfig} onChange={mockOnChange} />);
    
    const switches = screen.getAllByRole('switch');
    // Find and toggle push notification switch
    fireEvent.click(switches[0]); // First switch should be push
    
    expect(mockOnChange).toHaveBeenCalled();
  });

  it('shows save button when onSave provided', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<NotificationConfig config={mockConfig} onChange={mockOnChange} onSave={onSave} />);
    
    expect(screen.getByRole('button', { name: /salvar configurações/i })).toBeInTheDocument();
  });

  it('shows telegram section', () => {
    render(<NotificationConfig config={mockConfig} onChange={mockOnChange} />);
    expect(screen.getByText('Telegram')).toBeInTheDocument();
  });

  it('shows webhook section', () => {
    render(<NotificationConfig config={mockConfig} onChange={mockOnChange} />);
    expect(screen.getByText('Webhooks')).toBeInTheDocument();
  });
});
