import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import RichTextEditor from '@/components/RichTextEditor';

describe('RichTextEditor', () => {
  const mockOnChange = vi.fn();

  it('renders editor', () => {
    render(<RichTextEditor value="" onChange={mockOnChange} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('displays initial value', () => {
    render(<RichTextEditor value="<p>Hello</p>" onChange={mockOnChange} />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });

  it('shows toolbar', () => {
    render(<RichTextEditor value="" onChange={mockOnChange} />);
    expect(screen.getByRole('toolbar')).toBeInTheDocument();
  });

  it('has bold button', () => {
    render(<RichTextEditor value="" onChange={mockOnChange} />);
    expect(screen.getByRole('button', { name: /negrito/i })).toBeInTheDocument();
  });

  it('has italic button', () => {
    render(<RichTextEditor value="" onChange={mockOnChange} />);
    expect(screen.getByRole('button', { name: /itálico/i })).toBeInTheDocument();
  });
});
