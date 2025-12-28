import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FileUploadZone from '@/components/FileUploadZone';

describe('FileUploadZone', () => {
  const mockOnUpload = vi.fn();

  it('renders drop zone', () => {
    render(<FileUploadZone onUpload={mockOnUpload} />);
    expect(screen.getByText(/arraste/i)).toBeInTheDocument();
  });

  it('handles file drop', async () => {
    render(<FileUploadZone onUpload={mockOnUpload} />);
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const dropzone = screen.getByTestId('dropzone');
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });
    await waitFor(() => expect(mockOnUpload).toHaveBeenCalledWith([file]));
  });

  it('handles file input change', async () => {
    render(<FileUploadZone onUpload={mockOnUpload} />);
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByTestId('file-input');
    fireEvent.change(input, { target: { files: [file] } });
    await waitFor(() => expect(mockOnUpload).toHaveBeenCalled());
  });

  it('validates file type', async () => {
    render(<FileUploadZone onUpload={mockOnUpload} accept=".pdf" />);
    const file = new File(['content'], 'test.txt', { type: 'text/plain' });
    const dropzone = screen.getByTestId('dropzone');
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });
    await waitFor(() => expect(screen.getByText(/tipo não permitido/i)).toBeInTheDocument());
  });

  it('validates file size', async () => {
    render(<FileUploadZone onUpload={mockOnUpload} maxSize={100} />);
    const file = new File(['x'.repeat(200)], 'test.txt', { type: 'text/plain' });
    const dropzone = screen.getByTestId('dropzone');
    fireEvent.drop(dropzone, { dataTransfer: { files: [file] } });
    await waitFor(() => expect(screen.getByText(/tamanho excede/i)).toBeInTheDocument());
  });

  it('shows drag active state', () => {
    render(<FileUploadZone onUpload={mockOnUpload} />);
    fireEvent.dragEnter(screen.getByTestId('dropzone'));
    expect(screen.getByTestId('dropzone')).toHaveClass('drag-active');
  });
});
