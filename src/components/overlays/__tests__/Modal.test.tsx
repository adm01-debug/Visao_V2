import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../Modal';

describe('Modal', () => {
  it('renders when open', () => {
    render(<Modal isOpen={true} onClose={() => {}}>Content</Modal>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<Modal isOpen={false} onClose={() => {}}>Content</Modal>);
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('renders title', () => {
    render(<Modal isOpen={true} onClose={() => {}} title="Test Title">Content</Modal>);
    expect(screen.getByText('Test Title')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<Modal isOpen={true} onClose={onClose} title="Title">Content</Modal>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<Modal isOpen={true} onClose={onClose}>Content</Modal>);
    
    const backdrop = container.querySelector('.bg-black\\/50');
    if (backdrop) fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });
});
