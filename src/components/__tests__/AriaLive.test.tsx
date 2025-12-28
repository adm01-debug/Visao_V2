import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import AriaLive from '@/components/AriaLive';

describe('AriaLive', () => {
  it('renders with polite aria-live by default', () => {
    render(<AriaLive>Message</AriaLive>);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('renders with assertive when specified', () => {
    render(<AriaLive mode="assertive">Urgent</AriaLive>);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });

  it('renders children content', () => {
    render(<AriaLive>Test content</AriaLive>);
    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('applies aria-atomic when specified', () => {
    render(<AriaLive atomic>Atomic</AriaLive>);
    expect(screen.getByRole('status')).toHaveAttribute('aria-atomic', 'true');
  });
});
