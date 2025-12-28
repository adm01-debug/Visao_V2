import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LiveRegion from '@/components/LiveRegion';

describe('LiveRegion', () => {
  it('renders with aria-live', () => {
    render(<LiveRegion>Message</LiveRegion>);
    expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
  });

  it('supports assertive mode', () => {
    render(<LiveRegion mode="assertive">Urgent</LiveRegion>);
    expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
  });

  it('renders children', () => {
    render(<LiveRegion>Test message</LiveRegion>);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });
});
