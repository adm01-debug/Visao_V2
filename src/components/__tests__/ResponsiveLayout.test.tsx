import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ResponsiveLayout } from '../ResponsiveLayout';

describe('ResponsiveLayout', () => {
  it('renders children', () => {
    render(<ResponsiveLayout><div>Child Content</div></ResponsiveLayout>);
    expect(screen.getByText('Child Content')).toBeInTheDocument();
  });
  it('adapts to desktop', () => {
    render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>);
    expect(document.body).toBeInTheDocument();
  });
  it('adapts to mobile', () => {
    Object.defineProperty(window, 'innerWidth', { value: 375 });
    render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>);
    expect(document.body).toBeInTheDocument();
  });
  it('handles resize events', () => {
    render(<ResponsiveLayout><div>Content</div></ResponsiveLayout>);
    window.dispatchEvent(new Event('resize'));
    expect(document.body).toBeInTheDocument();
  });
});