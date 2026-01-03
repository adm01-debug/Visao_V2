import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { NotificationSettings } from '../NotificationSettings';

const mockSettings = {
  enabled: true,
  desktop: true,
  sound: true,
  soundVolume: 80,
  email: true,
  telegram: false,
  push: true,
  quietHours: {
    enabled: false,
    start: '22:00',
    end: '07:00',
  },
};

describe('NotificationSettings', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders notification settings', () => {
    render(<NotificationSettings settings={mockSettings} onChange={mockOnChange} />);
    expect(screen.getByText('Preferências de Notificação')).toBeInTheDocument();
  });

  it('shows all notification channels', () => {
    render(<NotificationSettings settings={mockSettings} onChange={mockOnChange} />);
    
    expect(screen.getByText('Notificações Desktop')).toBeInTheDocument();
    expect(screen.getByText('Sons de Alerta')).toBeInTheDocument();
    expect(screen.getByText('Notificações por Email')).toBeInTheDocument();
    expect(screen.getByText('Telegram')).toBeInTheDocument();
    expect(screen.getByText('Push Mobile')).toBeInTheDocument();
  });

  it('shows quiet hours section', () => {
    render(<NotificationSettings settings={mockSettings} onChange={mockOnChange} />);
    expect(screen.getByText('Modo Silencioso')).toBeInTheDocument();
  });

  it('toggles master enabled switch', () => {
    render(<NotificationSettings settings={mockSettings} onChange={mockOnChange} />);
    
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]); // First switch is master
    
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      enabled: false,
    }));
  });

  it('shows volume slider when sound enabled', () => {
    render(<NotificationSettings settings={mockSettings} onChange={mockOnChange} />);
    expect(screen.getByText('Volume: 80%')).toBeInTheDocument();
  });

  it('hides volume slider when sound disabled', () => {
    render(
      <NotificationSettings 
        settings={{ ...mockSettings, sound: false }} 
        onChange={mockOnChange} 
      />
    );
    expect(screen.queryByText(/Volume:/)).not.toBeInTheDocument();
  });

  it('shows quiet hours inputs when enabled', () => {
    render(
      <NotificationSettings 
        settings={{ ...mockSettings, quietHours: { ...mockSettings.quietHours, enabled: true } }} 
        onChange={mockOnChange} 
      />
    );
    
    expect(screen.getByText('De:')).toBeInTheDocument();
    expect(screen.getByText('Até:')).toBeInTheDocument();
  });

  it('dims content when notifications disabled', () => {
    const { container } = render(
      <NotificationSettings 
        settings={{ ...mockSettings, enabled: false }} 
        onChange={mockOnChange} 
      />
    );
    
    expect(container.querySelector('.opacity-50')).toBeInTheDocument();
  });
});
