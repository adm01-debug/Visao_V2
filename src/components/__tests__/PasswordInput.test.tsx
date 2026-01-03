import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PasswordInput } from '../PasswordInput';

describe('PasswordInput', () => {
  it('renders with label', () => {
    render(<PasswordInput label="Sua senha" />);
    expect(screen.getByText('Sua senha')).toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    render(<PasswordInput id="password" />);
    
    const input = screen.getByRole('textbox', { hidden: true }) || document.querySelector('input');
    expect(input).toHaveAttribute('type', 'password');
    
    const toggleButton = screen.getByRole('button');
    fireEvent.click(toggleButton);
    
    expect(input).toHaveAttribute('type', 'text');
  });

  it('shows password requirements when focused', () => {
    render(<PasswordInput showRequirements value="" onChange={() => {}} />);
    
    const input = document.querySelector('input')!;
    fireEvent.focus(input);
    
    expect(screen.getByText('Mínimo 8 caracteres')).toBeInTheDocument();
    expect(screen.getByText('Uma letra maiúscula')).toBeInTheDocument();
    expect(screen.getByText('Uma letra minúscula')).toBeInTheDocument();
    expect(screen.getByText('Um número')).toBeInTheDocument();
    expect(screen.getByText('Um caractere especial')).toBeInTheDocument();
  });

  it('shows strength indicator', () => {
    render(<PasswordInput showStrengthIndicator value="Test123!" onChange={() => {}} />);
    
    expect(screen.getByText('Força da senha')).toBeInTheDocument();
  });

  it('displays error message', () => {
    render(<PasswordInput error="Senha muito fraca" />);
    expect(screen.getByText('Senha muito fraca')).toBeInTheDocument();
  });

  it('shows weak strength for short passwords', () => {
    render(<PasswordInput showStrengthIndicator value="ab" onChange={() => {}} />);
    expect(screen.getByText('Fraca')).toBeInTheDocument();
  });

  it('shows medium strength for moderate passwords', () => {
    render(<PasswordInput showStrengthIndicator value="Abcd1234" onChange={() => {}} />);
    expect(screen.getByText('Média')).toBeInTheDocument();
  });

  it('shows strong strength for complex passwords', () => {
    render(<PasswordInput showStrengthIndicator value="Abcd1234!@#" onChange={() => {}} />);
    expect(screen.getByText('Forte')).toBeInTheDocument();
  });

  it('accepts custom requirements', () => {
    const customRequirements = [
      { label: 'Mínimo 10 caracteres', test: (p: string) => p.length >= 10 },
    ];
    
    render(
      <PasswordInput 
        showRequirements 
        requirements={customRequirements}
        value=""
        onChange={() => {}}
      />
    );
    
    const input = document.querySelector('input')!;
    fireEvent.focus(input);
    
    expect(screen.getByText('Mínimo 10 caracteres')).toBeInTheDocument();
    expect(screen.queryByText('Mínimo 8 caracteres')).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<PasswordInput className="custom-class" />);
    const input = document.querySelector('input');
    expect(input).toHaveClass('custom-class');
  });
});
