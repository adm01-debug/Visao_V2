import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileUpload } from '../FileUpload';

describe('FileUpload', () => {
  it('renders upload area', () => {
    render(<FileUpload onFilesChange={() => {}} />);
    expect(screen.getByText(/Arraste arquivos/i)).toBeInTheDocument();
  });

  it('calls onFilesChange when files are selected', () => {
    const onFilesChange = vi.fn();
    render(<FileUpload onFilesChange={onFilesChange} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    
    Object.defineProperty(input, 'files', { value: [file] });
    fireEvent.change(input);
    
    expect(onFilesChange).toHaveBeenCalledWith([file]);
  });

  it('shows selected files', () => {
    const onFilesChange = vi.fn();
    render(<FileUpload onFilesChange={onFilesChange} />);
    
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(['test'], 'test.txt', { type: 'text/plain' });
    
    Object.defineProperty(input, 'files', { value: [file] });
    fireEvent.change(input);
    
    expect(screen.getByText('test.txt')).toBeInTheDocument();
  });
});
