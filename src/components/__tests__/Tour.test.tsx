import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Tour from '@/components/Tour';

const mockSteps = [
  { target: '#step1', title: 'Step 1', content: 'First step' },
  { target: '#step2', title: 'Step 2', content: 'Second step' },
];

describe('Tour', () => {
  it('renders when active', () => {
    render(<Tour steps={mockSteps} active onComplete={vi.fn()} />);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
  });

  it('does not render when inactive', () => {
    render(<Tour steps={mockSteps} active={false} onComplete={vi.fn()} />);
    expect(screen.queryByText('Step 1')).not.toBeInTheDocument();
  });

  it('shows step content', () => {
    render(<Tour steps={mockSteps} active onComplete={vi.fn()} />);
    expect(screen.getByText('First step')).toBeInTheDocument();
  });

  it('navigates to next step', () => {
    render(<Tour steps={mockSteps} active onComplete={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: /próximo/i }));
    expect(screen.getByText('Step 2')).toBeInTheDocument();
  });

  it('calls onComplete when finished', () => {
    const onComplete = vi.fn();
    render(<Tour steps={mockSteps} active onComplete={onComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /próximo/i }));
    fireEvent.click(screen.getByRole('button', { name: /concluir/i }));
    expect(onComplete).toHaveBeenCalled();
  });
});
