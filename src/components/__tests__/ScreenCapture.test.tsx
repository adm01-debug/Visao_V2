import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ScreenCapture from '@/components/ScreenCapture';

describe('ScreenCapture', () => {
  const mockOnCapture = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.navigator.mediaDevices = {
      getDisplayMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }),
    } as any;
  });

  it('renders capture button', () => {
    render(<ScreenCapture onCapture={mockOnCapture} />);
    expect(screen.getByRole('button', { name: /capturar/i })).toBeInTheDocument();
  });

  it('starts capture on click', async () => {
    render(<ScreenCapture onCapture={mockOnCapture} />);
    fireEvent.click(screen.getByRole('button', { name: /capturar/i }));
    await waitFor(() => expect(global.navigator.mediaDevices.getDisplayMedia).toHaveBeenCalled());
  });

  it('shows capture options', () => {
    render(<ScreenCapture onCapture={mockOnCapture} showOptions />);
    expect(screen.getByText(/tela inteira/i)).toBeInTheDocument();
  });
});
