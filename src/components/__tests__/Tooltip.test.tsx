import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Tooltip } from '../Tooltip';

describe('Tooltip', () => {
  it('renders trigger element', () => {
    render(<Tooltip content="Tooltip text"><button>Hover me</button></Tooltip>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows tooltip on hover', async () => {
    render(<Tooltip content="Tooltip text"><button>Hover me</button></Tooltip>);
    fireEvent.mouseEnter(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.getByText('Tooltip text')).toBeInTheDocument();
    });
  });

  it('hides tooltip on mouse leave', async () => {
    render(<Tooltip content="Tooltip text"><button>Hover me</button></Tooltip>);
    fireEvent.mouseEnter(screen.getByRole('button'));
    await screen.findByText('Tooltip text');
    fireEvent.mouseLeave(screen.getByRole('button'));
    await waitFor(() => {
      expect(screen.queryByText('Tooltip text')).not.toBeInTheDocument();
    });
  });

  it('supports different positions', () => {
    render(<Tooltip content="Tooltip" position="bottom"><button>Hover</button></Tooltip>);
    fireEvent.mouseEnter(screen.getByRole('button'));
    expect(screen.getByTestId('tooltip')).toHaveClass('bottom');
  });
});
