import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Avatar, AvatarFallback, AvatarImage } from '../avatar';

describe('Avatar', () => {
  it('deve renderizar corretamente', () => {
    render(<Avatar data-testid="avatar"><AvatarFallback>AB</AvatarFallback></Avatar>);
    expect(screen.getByTestId('avatar')).toBeInTheDocument();
  });

  it('deve exibir fallback', () => {
    render(<Avatar><AvatarFallback>JD</AvatarFallback></Avatar>);
    expect(screen.getByText('JD')).toBeInTheDocument();
  });

  it('deve renderizar imagem', () => {
    render(<Avatar><AvatarImage src="https://example.com/avatar.jpg" alt="Avatar" /><AvatarFallback>AB</AvatarFallback></Avatar>);
    expect(screen.getByRole('img')).toBeInTheDocument();
  });

  it('deve aceitar className', () => {
    render(<Avatar className="custom-avatar" data-testid="avatar"><AvatarFallback>AB</AvatarFallback></Avatar>);
    expect(screen.getByTestId('avatar')).toHaveClass('custom-avatar');
  });
});
