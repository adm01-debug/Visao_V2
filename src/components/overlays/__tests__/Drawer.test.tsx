import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Drawer } from '../Drawer';

describe('Drawer', () => {
  it('renders when open', () => {
    render(<Drawer isOpen={true} onClose={() => {}}>Content</Drawer>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<Drawer isOpen={false} onClose={() => {}}>Content</Drawer>);
    expect(screen.queryByText('Content')).not.toBeInTheDocument();
  });

  it('renders title', () => {
    render(<Drawer isOpen={true} onClose={() => {}} title="Drawer Title">Content</Drawer>);
    expect(screen.getByText('Drawer Title')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<Drawer isOpen={true} onClose={onClose} title="Title">Content</Drawer>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(onClose).toHaveBeenCalled();
  });

  it('applies position class', () => {
    const { container } = render(
      <Drawer isOpen={true} onClose={() => {}} position="left">Content</Drawer>
    );
    
    expect(container.querySelector('.left-0')).toBeInTheDocument();
  });
});
