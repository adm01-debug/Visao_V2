import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MediaRecorder from '@/components/MediaRecorder';

describe('MediaRecorder', () => {
  const mockOnRecordingComplete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.navigator.mediaDevices = {
      getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }),
    } as any;
  });

  it('renders record button', () => {
    render(<MediaRecorder onRecordingComplete={mockOnRecordingComplete} />);
    expect(screen.getByRole('button', { name: /gravar/i })).toBeInTheDocument();
  });

  it('starts recording on click', async () => {
    render(<MediaRecorder onRecordingComplete={mockOnRecordingComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /gravar/i }));
    await waitFor(() => expect(screen.getByText(/gravando/i)).toBeInTheDocument());
  });

  it('shows timer during recording', async () => {
    render(<MediaRecorder onRecordingComplete={mockOnRecordingComplete} showTimer />);
    fireEvent.click(screen.getByRole('button', { name: /gravar/i }));
    await waitFor(() => expect(screen.getByTestId('timer')).toBeInTheDocument());
  });

  it('stops recording', async () => {
    render(<MediaRecorder onRecordingComplete={mockOnRecordingComplete} />);
    fireEvent.click(screen.getByRole('button', { name: /gravar/i }));
    await waitFor(() => fireEvent.click(screen.getByRole('button', { name: /parar/i })));
    expect(mockOnRecordingComplete).toHaveBeenCalled();
  });
});
