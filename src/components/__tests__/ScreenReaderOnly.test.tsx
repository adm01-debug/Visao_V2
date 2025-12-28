import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ScreenReaderOnly from '@/components/ScreenReaderOnly';

describe('ScreenReaderOnly', () => {
  it('renders content', () => {
    render(<ScreenReaderOnly>Hidden text</ScreenReaderOnly>);
    expect(screen.getByText('Hidden text')).toBeInTheDocument();
  });

  it('applies sr-only class', () => {
    render(<ScreenReaderOnly>Hidden text</ScreenReaderOnly>);
    expect(screen.getByText('Hidden text')).toHaveClass('sr-only');
  });

  it('is accessible to screen readers', () => {
    render(<ScreenReaderOnly>Important info</ScreenReaderOnly>);
    const element = screen.getByText('Important info');
    expect(element).not.toHaveAttribute('aria-hidden', 'true');
  });
});
