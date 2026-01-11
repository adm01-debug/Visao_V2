import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TouchFeedback, Ripple, Highlight } from '../TouchFeedback';

describe('TouchFeedback', () => {
  describe('TouchFeedback Component', () => {
    it('renders children correctly', () => {
      render(
        <TouchFeedback>
          <button>Touch Me</button>
        </TouchFeedback>
      );
      expect(screen.getByText('Touch Me')).toBeInTheDocument();
    });

    it('shows feedback on touch', () => {
      render(
        <TouchFeedback>
          <button>Touch Me</button>
        </TouchFeedback>
      );
      
      const button = screen.getByText('Touch Me');
      fireEvent.touchStart(button);
      
      expect(button.parentElement).toHaveClass('active');
    });

    it('removes feedback on touch end', () => {
      render(
        <TouchFeedback>
          <button>Touch Me</button>
        </TouchFeedback>
      );
      
      const button = screen.getByText('Touch Me');
      fireEvent.touchStart(button);
      fireEvent.touchEnd(button);
      
      expect(button.parentElement).not.toHaveClass('active');
    });

    it('applies custom feedback color', () => {
      render(
        <TouchFeedback feedbackColor="rgba(255, 0, 0, 0.2)">
          <button>Touch Me</button>
        </TouchFeedback>
      );
      
      expect(screen.getByText('Touch Me').parentElement).toBeInTheDocument();
    });
  });

  describe('Ripple Component', () => {
    it('renders without crashing', () => {
      render(
        <Ripple>
          <button>Ripple Button</button>
        </Ripple>
      );
      expect(screen.getByText('Ripple Button')).toBeInTheDocument();
    });

    it('creates ripple effect on click', () => {
      render(
        <Ripple>
          <button>Ripple Button</button>
        </Ripple>
      );
      
      const button = screen.getByText('Ripple Button');
      fireEvent.click(button, { clientX: 50, clientY: 50 });
      
      expect(button.parentElement?.querySelector('.ripple')).toBeInTheDocument();
    });

    it('applies custom ripple color', () => {
      render(
        <Ripple color="blue">
          <button>Ripple Button</button>
        </Ripple>
      );
      
      expect(screen.getByText('Ripple Button')).toBeInTheDocument();
    });

    it('respects disabled state', () => {
      render(
        <Ripple disabled>
          <button>Ripple Button</button>
        </Ripple>
      );
      
      const button = screen.getByText('Ripple Button');
      fireEvent.click(button);
      
      expect(button.parentElement?.querySelector('.ripple')).not.toBeInTheDocument();
    });
  });

  describe('Highlight Component', () => {
    it('renders children correctly', () => {
      render(
        <Highlight>
          <div>Highlight Content</div>
        </Highlight>
      );
      expect(screen.getByText('Highlight Content')).toBeInTheDocument();
    });

    it('applies highlight on hover', () => {
      render(
        <Highlight>
          <div>Highlight Content</div>
        </Highlight>
      );
      
      const element = screen.getByText('Highlight Content');
      fireEvent.mouseEnter(element);
      
      expect(element.parentElement).toHaveClass('highlighted');
    });

    it('removes highlight on mouse leave', () => {
      render(
        <Highlight>
          <div>Highlight Content</div>
        </Highlight>
      );
      
      const element = screen.getByText('Highlight Content');
      fireEvent.mouseEnter(element);
      fireEvent.mouseLeave(element);
      
      expect(element.parentElement).not.toHaveClass('highlighted');
    });
  });
});
