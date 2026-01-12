import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Alert } from '../Alert';

describe('Alert', () => {
  it('renders children', () => {
    render(<Alert>Alert message</Alert>);
    expect(screen.getByText('Alert message')).toBeInTheDocument();
  });

  it('renders title', () => {
    render(<Alert title="Title">Message</Alert>);
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('renders close button when onClose provided', () => {
    const onClose = vi.fn();
    render(<Alert onClose={onClose}>Message</Alert>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalled();
  });

  it('applies variant styles', () => {
    const { container } = render(<Alert variant="error">Error</Alert>);
    expect(container.firstChild).toHaveClass('bg-red-50');
  });
});
