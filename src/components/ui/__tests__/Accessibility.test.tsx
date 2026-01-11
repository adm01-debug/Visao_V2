import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Accessibility, SkipLink, FocusTrap, LiveRegion } from '../Accessibility';

describe('Accessibility', () => {
  describe('SkipLink', () => {
    it('renders skip link', () => {
      render(<SkipLink href="#main">Skip to content</SkipLink>);
      expect(screen.getByText('Skip to content')).toBeInTheDocument();
    });

    it('has correct href', () => {
      render(<SkipLink href="#main">Skip</SkipLink>);
      expect(screen.getByRole('link')).toHaveAttribute('href', '#main');
    });
  });

  describe('FocusTrap', () => {
    it('renders children', () => {
      render(
        <FocusTrap active>
          <button>Button 1</button>
          <button>Button 2</button>
        </FocusTrap>
      );
      expect(screen.getByText('Button 1')).toBeInTheDocument();
    });
  });

  describe('LiveRegion', () => {
    it('renders with polite assertiveness', () => {
      render(<LiveRegion message="Update" assertive={false} />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-live', 'polite');
    });

    it('renders with assertive role', () => {
      render(<LiveRegion message="Alert" assertive />);
      expect(screen.getByRole('alert')).toHaveAttribute('aria-live', 'assertive');
    });
  });
});
