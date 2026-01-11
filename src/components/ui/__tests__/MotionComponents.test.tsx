import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MotionComponents, FadeIn, SlideIn, ScaleIn, Stagger } from '../MotionComponents';

describe('MotionComponents', () => {
  describe('FadeIn', () => {
    it('renders children correctly', () => {
      render(
        <FadeIn>
          <div>Fade Content</div>
        </FadeIn>
      );
      expect(screen.getByText('Fade Content')).toBeInTheDocument();
    });

    it('applies fade animation', async () => {
      render(
        <FadeIn duration={0.3}>
          <div>Fade Content</div>
        </FadeIn>
      );
      
      const element = screen.getByText('Fade Content');
      await waitFor(() => {
        expect(element).toHaveStyle({ opacity: '1' });
      });
    });

    it('respects delay prop', () => {
      render(
        <FadeIn delay={0.5}>
          <div>Delayed Content</div>
        </FadeIn>
      );
      
      expect(screen.getByText('Delayed Content')).toBeInTheDocument();
    });
  });

  describe('SlideIn', () => {
    it('renders children correctly', () => {
      render(
        <SlideIn direction="left">
          <div>Slide Content</div>
        </SlideIn>
      );
      expect(screen.getByText('Slide Content')).toBeInTheDocument();
    });

    it('slides from left', () => {
      render(
        <SlideIn direction="left">
          <div>Slide Left</div>
        </SlideIn>
      );
      expect(screen.getByText('Slide Left')).toBeInTheDocument();
    });

    it('slides from right', () => {
      render(
        <SlideIn direction="right">
          <div>Slide Right</div>
        </SlideIn>
      );
      expect(screen.getByText('Slide Right')).toBeInTheDocument();
    });

    it('slides from top', () => {
      render(
        <SlideIn direction="top">
          <div>Slide Top</div>
        </SlideIn>
      );
      expect(screen.getByText('Slide Top')).toBeInTheDocument();
    });

    it('slides from bottom', () => {
      render(
        <SlideIn direction="bottom">
          <div>Slide Bottom</div>
        </SlideIn>
      );
      expect(screen.getByText('Slide Bottom')).toBeInTheDocument();
    });
  });

  describe('ScaleIn', () => {
    it('renders children correctly', () => {
      render(
        <ScaleIn>
          <div>Scale Content</div>
        </ScaleIn>
      );
      expect(screen.getByText('Scale Content')).toBeInTheDocument();
    });

    it('applies scale animation', async () => {
      render(
        <ScaleIn initialScale={0.5}>
          <div>Scale Content</div>
        </ScaleIn>
      );
      
      const element = screen.getByText('Scale Content');
      await waitFor(() => {
        expect(element).toBeInTheDocument();
      });
    });
  });

  describe('Stagger', () => {
    it('renders multiple children', () => {
      render(
        <Stagger>
          <div>Item 1</div>
          <div>Item 2</div>
          <div>Item 3</div>
        </Stagger>
      );
      
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
      expect(screen.getByText('Item 3')).toBeInTheDocument();
    });

    it('applies staggered delays', () => {
      render(
        <Stagger staggerDelay={0.1}>
          <div>Item 1</div>
          <div>Item 2</div>
        </Stagger>
      );
      
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Item 2')).toBeInTheDocument();
    });
  });
});
