import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SignaturePad from '@/components/SignaturePad';

describe('SignaturePad', () => {
  const mockOnChange = vi.fn();

  it('renders canvas', () => {
    render(<SignaturePad onChange={mockOnChange} />);
    expect(screen.getByTestId('signature-canvas')).toBeInTheDocument();
  });

  it('shows clear button', () => {
    render(<SignaturePad onChange={mockOnChange} />);
    expect(screen.getByRole('button', { name: /limpar/i })).toBeInTheDocument();
  });

  it('clears signature on clear click', () => {
    render(<SignaturePad onChange={mockOnChange} />);
    fireEvent.click(screen.getByRole('button', { name: /limpar/i }));
    expect(mockOnChange).toHaveBeenCalledWith(null);
  });

  it('applies custom width/height', () => {
    render(<SignaturePad onChange={mockOnChange} width={400} height={200} />);
    const canvas = screen.getByTestId('signature-canvas');
    expect(canvas).toHaveAttribute('width', '400');
    expect(canvas).toHaveAttribute('height', '200');
  });
});
