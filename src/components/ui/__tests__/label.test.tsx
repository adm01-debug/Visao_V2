import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { Label } from '../label';

describe('Label', () => {
  it('deve renderizar corretamente', () => {
    render(<Label>Test Label</Label>);
    expect(screen.getByText('Test Label')).toBeInTheDocument();
  });

  it('deve ter role de label', () => {
    render(<Label>Label</Label>);
    expect(screen.getByText('Label').tagName).toBe('LABEL');
  });

  it('deve aceitar htmlFor', () => {
    render(<Label htmlFor="input-id">Label</Label>);
    expect(screen.getByText('Label')).toHaveAttribute('for', 'input-id');
  });

  it('deve aceitar className customizada', () => {
    render(<Label className="custom-label">Label</Label>);
    expect(screen.getByText('Label')).toHaveClass('custom-label');
  });

  it('deve ter classes base', () => {
    render(<Label>Label</Label>);
    expect(screen.getByText('Label')).toHaveClass('text-sm', 'font-medium');
  });

  it('deve renderizar children complexos', () => {
    render(<Label><span data-testid="child">Child</span></Label>);
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('deve aplicar peer-disabled styles', () => {
    render(<Label>Label</Label>);
    expect(screen.getByText('Label')).toHaveClass('peer-disabled:cursor-not-allowed');
  });
});
