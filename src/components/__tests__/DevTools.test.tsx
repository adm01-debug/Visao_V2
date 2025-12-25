import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DevTools } from '../DevTools';

describe('DevTools', () => {
  it('renders devtools panel', () => {
    render(<DevTools />);
    expect(screen.getByTestId('devtools')).toBeInTheDocument();
  });

  it('toggles visibility', () => {
    render(<DevTools />);
    const toggle = screen.getByRole('button', { name: /toggle/i });
    fireEvent.click(toggle);
    expect(screen.getByTestId('devtools-panel')).toHaveClass('open');
  });

  it('shows performance metrics', () => {
    render(<DevTools showPerformance />);
    expect(screen.getByText(/fps/i)).toBeInTheDocument();
  });

  it('only renders in development', () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { container } = render(<DevTools />);
    expect(container).toBeEmptyDOMElement();
    vi.unstubAllEnvs();
  });
});
