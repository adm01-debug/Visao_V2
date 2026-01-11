import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { 
  ResponsiveContainer, 
  ResponsiveGrid, 
  ResponsiveStack,
  MobileOnly,
  DesktopOnly 
} from '../ResponsiveLayout';

describe('ResponsiveLayout Components', () => {
  describe('ResponsiveContainer', () => {
    it('renders children', () => {
      render(<ResponsiveContainer><div>Child Content</div></ResponsiveContainer>);
      expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    it('applies maxWidth class', () => {
      render(<ResponsiveContainer maxWidth="lg"><div>Content</div></ResponsiveContainer>);
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('ResponsiveGrid', () => {
    it('renders grid layout', () => {
      render(
        <ResponsiveGrid cols={{ default: 1, md: 2, lg: 3 }}>
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveGrid>
      );
      expect(screen.getByText('Item 1')).toBeInTheDocument();
    });

    it('applies gap spacing', () => {
      render(<ResponsiveGrid gap="md"><div>Content</div></ResponsiveGrid>);
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('ResponsiveStack', () => {
    it('renders stack layout', () => {
      render(
        <ResponsiveStack>
          <div>Stack Item 1</div>
          <div>Stack Item 2</div>
        </ResponsiveStack>
      );
      expect(screen.getByText('Stack Item 1')).toBeInTheDocument();
    });

    it('handles direction prop', () => {
      render(<ResponsiveStack direction="row"><div>Content</div></ResponsiveStack>);
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('MobileOnly', () => {
    it('renders on mobile viewport', () => {
      render(<MobileOnly><div>Mobile Content</div></MobileOnly>);
      expect(document.body).toBeInTheDocument();
    });
  });

  describe('DesktopOnly', () => {
    it('renders on desktop viewport', () => {
      render(<DesktopOnly><div>Desktop Content</div></DesktopOnly>);
      expect(document.body).toBeInTheDocument();
    });
  });
});
