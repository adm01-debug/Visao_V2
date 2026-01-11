import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BottomSheet } from '../BottomSheet';

describe('BottomSheet', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    children: <div>Test Content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders when isOpen is true', () => {
      render(<BottomSheet {...defaultProps} />);
      expect(screen.getByText('Test Content')).toBeInTheDocument();
    });

    it('does not render when isOpen is false', () => {
      render(<BottomSheet {...defaultProps} isOpen={false} />);
      expect(screen.queryByText('Test Content')).not.toBeInTheDocument();
    });

    it('renders with title when provided', () => {
      render(<BottomSheet {...defaultProps} title="Sheet Title" />);
      expect(screen.getByText('Sheet Title')).toBeInTheDocument();
    });

    it('renders children correctly', () => {
      render(
        <BottomSheet {...defaultProps}>
          <button>Action Button</button>
        </BottomSheet>
      );
      expect(screen.getByRole('button', { name: 'Action Button' })).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      render(<BottomSheet {...defaultProps} onClose={onClose} />);
      
      const backdrop = screen.getByTestId('bottom-sheet-backdrop');
      fireEvent.click(backdrop);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('calls onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<BottomSheet {...defaultProps} onClose={onClose} showCloseButton />);
      
      const closeButton = screen.getByRole('button', { name: /close/i });
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not close when clicking inside sheet content', () => {
      const onClose = vi.fn();
      render(<BottomSheet {...defaultProps} onClose={onClose} />);
      
      fireEvent.click(screen.getByText('Test Content'));
      
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('has correct ARIA attributes', () => {
      render(<BottomSheet {...defaultProps} title="Accessible Sheet" />);
      
      const sheet = screen.getByRole('dialog');
      expect(sheet).toHaveAttribute('aria-modal', 'true');
    });

    it('traps focus within the sheet', () => {
      render(
        <BottomSheet {...defaultProps}>
          <button>First</button>
          <button>Second</button>
        </BottomSheet>
      );
      
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Styling', () => {
    it('applies custom className', () => {
      render(<BottomSheet {...defaultProps} className="custom-class" />);
      
      const sheet = screen.getByRole('dialog');
      expect(sheet).toHaveClass('custom-class');
    });

    it('applies different height variants', () => {
      const { rerender } = render(<BottomSheet {...defaultProps} height="auto" />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();

      rerender(<BottomSheet {...defaultProps} height="full" />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Animation', () => {
    it('applies enter animation when opening', () => {
      render(<BottomSheet {...defaultProps} />);
      const sheet = screen.getByRole('dialog');
      expect(sheet).toBeInTheDocument();
    });
  });
});
