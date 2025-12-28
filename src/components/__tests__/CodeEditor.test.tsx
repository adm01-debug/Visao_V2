import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import CodeEditor from '@/components/CodeEditor';

describe('CodeEditor', () => {
  const mockOnChange = vi.fn();

  it('renders editor container', () => {
    render(<CodeEditor value="" onChange={mockOnChange} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('displays initial value', () => {
    render(<CodeEditor value="const x = 1;" onChange={mockOnChange} />);
    expect(screen.getByDisplayValue(/const x = 1/)).toBeInTheDocument();
  });

  it('calls onChange when content changes', () => {
    render(<CodeEditor value="" onChange={mockOnChange} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'new code' } });
    expect(mockOnChange).toHaveBeenCalledWith('new code');
  });

  it('applies language highlighting', () => {
    render(<CodeEditor value="" onChange={mockOnChange} language="javascript" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('data-language', 'javascript');
  });

  it('shows line numbers when enabled', () => {
    render(<CodeEditor value="line1\nline2" onChange={mockOnChange} showLineNumbers />);
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
  });
});
