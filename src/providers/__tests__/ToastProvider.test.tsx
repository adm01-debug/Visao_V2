import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ToastProvider, useToast } from '@/providers/ToastProvider';

const TestComponent = () => {
  const { showToast } = useToast();
  return <button onClick={() => showToast({ message: 'Hello!' })}>Show Toast</button>;
};

describe('ToastProvider', () => {
  it('renders children', () => {
    render(<ToastProvider><div>Content</div></ToastProvider>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('provides toast context', () => {
    render(<ToastProvider><TestComponent /></ToastProvider>);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('shows toast on trigger', async () => {
    render(<ToastProvider><TestComponent /></ToastProvider>);
    fireEvent.click(screen.getByRole('button'));
    await waitFor(() => expect(screen.getByText('Hello!')).toBeInTheDocument());
  });
});
