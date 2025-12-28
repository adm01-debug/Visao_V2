import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import TagsInput from '@/components/TagsInput';

describe('TagsInput', () => {
  const mockOnChange = vi.fn();

  it('renders input', () => {
    render(<TagsInput value={[]} onChange={mockOnChange} />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('displays existing tags', () => {
    render(<TagsInput value={['tag1', 'tag2']} onChange={mockOnChange} />);
    expect(screen.getByText('tag1')).toBeInTheDocument();
    expect(screen.getByText('tag2')).toBeInTheDocument();
  });

  it('adds tag on Enter', () => {
    render(<TagsInput value={[]} onChange={mockOnChange} />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'new-tag' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(mockOnChange).toHaveBeenCalledWith(['new-tag']);
  });

  it('removes tag on X click', () => {
    render(<TagsInput value={['tag1']} onChange={mockOnChange} />);
    fireEvent.click(screen.getByRole('button', { name: /remover/i }));
    expect(mockOnChange).toHaveBeenCalledWith([]);
  });

  it('validates max tags', () => {
    render(<TagsInput value={['a', 'b', 'c']} onChange={mockOnChange} maxTags={3} />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });
});
