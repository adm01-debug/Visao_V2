import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TelegramConfig } from '../TelegramConfig';

const mockConfig = {
  enabled: true,
  botToken: '123456:ABC',
  chatId: '987654',
  verified: false,
};

describe('TelegramConfig', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders telegram config', () => {
    render(<TelegramConfig config={mockConfig} onChange={mockOnChange} />);
    expect(screen.getByText('Telegram')).toBeInTheDocument();
  });

  it('shows description', () => {
    render(<TelegramConfig config={mockConfig} onChange={mockOnChange} />);
    expect(screen.getByText('Receba alertas diretamente no Telegram')).toBeInTheDocument();
  });

  it('shows bot token input', () => {
    render(<TelegramConfig config={mockConfig} onChange={mockOnChange} />);
    expect(screen.getByLabelText(/token do bot/i)).toBeInTheDocument();
  });

  it('shows chat id input', () => {
    render(<TelegramConfig config={mockConfig} onChange={mockOnChange} />);
    expect(screen.getByLabelText(/chat id/i)).toBeInTheDocument();
  });

  it('shows instructions', () => {
    render(<TelegramConfig config={mockConfig} onChange={mockOnChange} />);
    expect(screen.getByText(/crie um bot no telegram/i)).toBeInTheDocument();
  });

  it('toggles enabled state', () => {
    render(<TelegramConfig config={mockConfig} onChange={mockOnChange} />);
    
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);
    
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      enabled: false,
    }));
  });

  it('updates bot token', () => {
    render(<TelegramConfig config={mockConfig} onChange={mockOnChange} />);
    
    const input = screen.getByLabelText(/token do bot/i);
    fireEvent.change(input, { target: { value: 'new-token' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      botToken: 'new-token',
      verified: false,
    }));
  });

  it('updates chat id', () => {
    render(<TelegramConfig config={mockConfig} onChange={mockOnChange} />);
    
    const input = screen.getByLabelText(/chat id/i);
    fireEvent.change(input, { target: { value: '111222' } });
    
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      chatId: '111222',
    }));
  });

  it('shows test button when onTest provided', () => {
    const onTest = vi.fn().mockResolvedValue(true);
    render(<TelegramConfig config={mockConfig} onChange={mockOnChange} onTest={onTest} />);
    
    expect(screen.getByRole('button', { name: /testar conexão/i })).toBeInTheDocument();
  });

  it('calls onTest when test button clicked', async () => {
    const onTest = vi.fn().mockResolvedValue(true);
    render(<TelegramConfig config={mockConfig} onChange={mockOnChange} onTest={onTest} />);
    
    fireEvent.click(screen.getByRole('button', { name: /testar conexão/i }));
    
    await waitFor(() => {
      expect(onTest).toHaveBeenCalled();
    });
  });

  it('shows verified badge when verified', () => {
    render(
      <TelegramConfig 
        config={{ ...mockConfig, verified: true }} 
        onChange={mockOnChange} 
      />
    );
    
    expect(screen.getByText('Configuração verificada')).toBeInTheDocument();
  });

  it('dims content when disabled', () => {
    const { container } = render(
      <TelegramConfig 
        config={{ ...mockConfig, enabled: false }} 
        onChange={mockOnChange} 
      />
    );
    
    expect(container.querySelector('.opacity-50')).toBeInTheDocument();
  });
});
