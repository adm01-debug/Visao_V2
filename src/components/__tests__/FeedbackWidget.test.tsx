import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FeedbackWidget from '@/components/FeedbackWidget';

describe('FeedbackWidget', () => {
  const mockOnSubmit = vi.fn().mockResolvedValue(undefined);

  it('renders feedback button', () => {
    render(<FeedbackWidget onSubmit={mockOnSubmit} />);
    expect(screen.getByRole('button', { name: /feedback/i })).toBeInTheDocument();
  });

  it('opens form on click', () => {
    render(<FeedbackWidget onSubmit={mockOnSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: /feedback/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('shows rating options', () => {
    render(<FeedbackWidget onSubmit={mockOnSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: /feedback/i }));
    expect(screen.getAllByRole('radio')).toHaveLength(5);
  });

  it('submits feedback', async () => {
    render(<FeedbackWidget onSubmit={mockOnSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: /feedback/i }));
    fireEvent.click(screen.getAllByRole('radio')[4]);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'Great!' } });
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
    await waitFor(() => expect(mockOnSubmit).toHaveBeenCalled());
  });

  it('shows success message after submit', async () => {
    render(<FeedbackWidget onSubmit={mockOnSubmit} />);
    fireEvent.click(screen.getByRole('button', { name: /feedback/i }));
    fireEvent.click(screen.getAllByRole('radio')[4]);
    fireEvent.click(screen.getByRole('button', { name: /enviar/i }));
    await waitFor(() => expect(screen.getByText(/obrigado/i)).toBeInTheDocument());
  });
});
