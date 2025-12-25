import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorFallback } from '../ErrorFallback';

describe('ErrorFallback', () => {
  const mockError = new Error('Test error message');
  const mockReset = vi.fn();

  it('displays error message', () => {
    render(<ErrorFallback error={mockError} resetErrorBoundary={mockReset} />);
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('shows error details', () => {
    render(<ErrorFallback error={mockError} resetErrorBoundary={mockReset} />);
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('calls reset on retry button click', () => {
    render(<ErrorFallback error={mockError} resetErrorBoundary={mockReset} />);
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(mockReset).toHaveBeenCalled();
  });

  it('renders with custom title', () => {
    render(<ErrorFallback error={mockError} resetErrorBoundary={mockReset} title="Custom Error" />);
    expect(screen.getByText('Custom Error')).toBeInTheDocument();
  });
});
