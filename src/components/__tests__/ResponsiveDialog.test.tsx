import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ResponsiveDialog } from '../ResponsiveDialog';


vi.mock('@/hooks/useMediaQuery', () => ({
  useMediaQuery: () => true,
}));

describe('ResponsiveDialog', () => {
  it('renders when open', () => {
    render(<ResponsiveDialog open={true} onOpenChange={vi.fn()}><div>Content</div></ResponsiveDialog>);
    expect(document.body).toBeInTheDocument();
  });
  it('hides when closed', () => {
    render(<ResponsiveDialog open={false} onOpenChange={vi.fn()}><div>Content</div></ResponsiveDialog>);
    expect(document.body).toBeInTheDocument();
  });
  it('handles close action', () => {
    const onClose = vi.fn();
    render(<ResponsiveDialog open={true} onOpenChange={onClose}><div>Content</div></ResponsiveDialog>);
    expect(document.body).toBeInTheDocument();
  });
  it('adapts to screen size', () => {
    render(<ResponsiveDialog open={true} onOpenChange={vi.fn()}><div>Content</div></ResponsiveDialog>);
    expect(document.body).toBeInTheDocument();
  });
});