import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SecuritySettings } from '../SecuritySettings';

const mockSettings = {
  twoFactorEnabled: true,
  sessionTimeout: 30,
  passwordPolicy: {
    minLength: 8,
    requireUppercase: true,
    requireNumbers: true,
    requireSpecialChars: false,
  },
  loginAttempts: {
    maxAttempts: 5,
    lockoutDuration: 30,
  },
  ipWhitelist: {
    enabled: false,
    ips: [],
  },
  auditLog: true,
  encryptStorage: true,
};

describe('SecuritySettings', () => {
  const mockOnChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders security settings', () => {
    render(<SecuritySettings settings={mockSettings} onChange={mockOnChange} />);
    expect(screen.getByText('Configurações de Segurança')).toBeInTheDocument();
  });

  it('shows security score badge', () => {
    render(<SecuritySettings settings={mockSettings} onChange={mockOnChange} />);
    expect(screen.getByText(/% Seguro/)).toBeInTheDocument();
  });

  it('shows two-factor authentication toggle', () => {
    render(<SecuritySettings settings={mockSettings} onChange={mockOnChange} />);
    expect(screen.getByText('Autenticação em Dois Fatores')).toBeInTheDocument();
  });

  it('toggles two-factor authentication', () => {
    render(<SecuritySettings settings={mockSettings} onChange={mockOnChange} />);
    
    const switches = screen.getAllByRole('switch');
    fireEvent.click(switches[0]);
    
    expect(mockOnChange).toHaveBeenCalledWith(expect.objectContaining({
      twoFactorEnabled: false,
    }));
  });

  it('shows password policy section', () => {
    render(<SecuritySettings settings={mockSettings} onChange={mockOnChange} />);
    expect(screen.getByText('Política de Senhas')).toBeInTheDocument();
  });

  it('shows audit log toggle', () => {
    render(<SecuritySettings settings={mockSettings} onChange={mockOnChange} />);
    expect(screen.getByText('Log de Auditoria')).toBeInTheDocument();
  });

  it('shows encryption toggle', () => {
    render(<SecuritySettings settings={mockSettings} onChange={mockOnChange} />);
    expect(screen.getByText('Criptografia de Dados')).toBeInTheDocument();
  });

  it('shows save button when onSave provided', () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<SecuritySettings settings={mockSettings} onChange={mockOnChange} onSave={onSave} />);
    
    expect(screen.getByRole('button', { name: /salvar configurações/i })).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <SecuritySettings settings={mockSettings} onChange={mockOnChange} className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });
});
