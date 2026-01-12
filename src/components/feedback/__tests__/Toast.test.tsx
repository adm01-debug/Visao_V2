import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Toast } from '../Toast';

describe('Toast', () => {
  it('renders message', () => {
    render(<Toast type="success" message="Success!" />);
    expect(screen.getByText('Success!')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<Toast type="error" message="Error" onClose={onClose} />);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalled();
  });

  it('applies correct styles for each type', () => {
    const { rerender, container } = render(<Toast type="success" message="Test" />);
    expect(container.firstChild).toHaveClass('border-green-500');
    
    rerender(<Toast type="error" message="Test" />);
    expect(container.firstChild).toHaveClass('border-red-500');
  });
});
