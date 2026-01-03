import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TelegramSettings } from '../TelegramSettings';

describe('TelegramSettings', () => {
  const defaultProps = {
    enabled: true,
    chatId: '123456',
    isConnected: true,
    onEnabledChange: vi.fn(),
    onChatIdChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders telegram settings', () => {
    render(<TelegramSettings {...defaultProps} />);
    expect(screen.getByText('Telegram')).toBeInTheDocument();
  });

  it('shows connected badge when connected', () => {
    render(<TelegramSettings {...defaultProps} isConnected={true} />);
    expect(screen.getByText('Conectado')).toBeInTheDocument();
  });

  it('shows disconnected badge when not connected', () => {
    render(<TelegramSettings {...defaultProps} isConnected={false} />);
    expect(screen.getByText('Desconectado')).toBeInTheDocument();
  });

  it('shows chat id input', () => {
    render(<TelegramSettings {...defaultProps} />);
    expect(screen.getByLabelText(/chat id/i)).toBeInTheDocument();
  });

  it('displays current chat id', () => {
    render(<TelegramSettings {...defaultProps} chatId="123456" />);
    expect(screen.getByDisplayValue('123456')).toBeInTheDocument();
  });

  it('calls onEnabledChange when switch toggled', () => {
    render(<TelegramSettings {...defaultProps} />);
    
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);
    
    expect(defaultProps.onEnabledChange).toHaveBeenCalledWith(false);
  });

  it('calls onChatIdChange when input changes', () => {
    render(<TelegramSettings {...defaultProps} />);
    
    const input = screen.getByLabelText(/chat id/i);
    fireEvent.change(input, { target: { value: 'new-id' } });
    
    expect(defaultProps.onChatIdChange).toHaveBeenCalledWith('new-id');
  });

  it('dims content when disabled', () => {
    const { container } = render(<TelegramSettings {...defaultProps} enabled={false} />);
    expect(container.querySelector('.opacity-50')).toBeInTheDocument();
  });

  it('shows helper text', () => {
    render(<TelegramSettings {...defaultProps} />);
    expect(screen.getByText(/envie \/start/i)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<TelegramSettings {...defaultProps} className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
