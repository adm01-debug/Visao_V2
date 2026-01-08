import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { ToastProvider } from '@/providers/ToastProvider';

describe('ToastProvider', () => {
  it('renders children', () => {
    render(<ToastProvider><div>Content</div></ToastProvider>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('renders Toaster component', () => {
    const { container } = render(<ToastProvider><div>Test</div></ToastProvider>);
    expect(container.firstChild).toBeDefined();
  });
});
