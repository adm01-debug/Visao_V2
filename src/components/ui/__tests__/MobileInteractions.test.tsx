import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MobileInteractions, SwipeHandler, PullToRefresh, LongPressHandler } from '../MobileInteractions';

describe('MobileInteractions', () => {
  describe('SwipeHandler', () => {
    it('renders children correctly', () => {
      render(
        <SwipeHandler onSwipe={vi.fn()}>
          <div>Swipeable Content</div>
        </SwipeHandler>
      );
      expect(screen.getByText('Swipeable Content')).toBeInTheDocument();
    });

    it('calls onSwipe with left direction', () => {
      const onSwipe = vi.fn();
      render(
        <SwipeHandler onSwipe={onSwipe}>
          <div>Swipeable</div>
        </SwipeHandler>
      );
      
      const element = screen.getByText('Swipeable');
      fireEvent.touchStart(element, { touches: [{ clientX: 200, clientY: 100 }] });
      fireEvent.touchEnd(element, { changedTouches: [{ clientX: 50, clientY: 100 }] });
      
      expect(onSwipe).toHaveBeenCalledWith('left');
    });

    it('calls onSwipe with right direction', () => {
      const onSwipe = vi.fn();
      render(
        <SwipeHandler onSwipe={onSwipe}>
          <div>Swipeable</div>
        </SwipeHandler>
      );
      
      const element = screen.getByText('Swipeable');
      fireEvent.touchStart(element, { touches: [{ clientX: 50, clientY: 100 }] });
      fireEvent.touchEnd(element, { changedTouches: [{ clientX: 200, clientY: 100 }] });
      
      expect(onSwipe).toHaveBeenCalledWith('right');
    });

    it('respects threshold for swipe detection', () => {
      const onSwipe = vi.fn();
      render(
        <SwipeHandler onSwipe={onSwipe} threshold={100}>
          <div>Swipeable</div>
        </SwipeHandler>
      );
      
      const element = screen.getByText('Swipeable');
      fireEvent.touchStart(element, { touches: [{ clientX: 100, clientY: 100 }] });
      fireEvent.touchEnd(element, { changedTouches: [{ clientX: 120, clientY: 100 }] });
      
      expect(onSwipe).not.toHaveBeenCalled();
    });
  });

  describe('PullToRefresh', () => {
    it('renders children correctly', () => {
      render(
        <PullToRefresh onRefresh={vi.fn()}>
          <div>Refreshable Content</div>
        </PullToRefresh>
      );
      expect(screen.getByText('Refreshable Content')).toBeInTheDocument();
    });

    it('calls onRefresh when pulled down', async () => {
      const onRefresh = vi.fn().mockResolvedValue(undefined);
      render(
        <PullToRefresh onRefresh={onRefresh}>
          <div>Refreshable</div>
        </PullToRefresh>
      );
      
      const element = screen.getByText('Refreshable');
      fireEvent.touchStart(element, { touches: [{ clientY: 0 }] });
      fireEvent.touchMove(element, { touches: [{ clientY: 100 }] });
      fireEvent.touchEnd(element);
      
      expect(onRefresh).toHaveBeenCalled();
    });

    it('shows loading indicator during refresh', () => {
      render(
        <PullToRefresh onRefresh={vi.fn()} isRefreshing>
          <div>Content</div>
        </PullToRefresh>
      );
      
      expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });
  });

  describe('LongPressHandler', () => {
    it('renders children correctly', () => {
      render(
        <LongPressHandler onLongPress={vi.fn()}>
          <div>Long Press Me</div>
        </LongPressHandler>
      );
      expect(screen.getByText('Long Press Me')).toBeInTheDocument();
    });

    it('calls onLongPress after delay', async () => {
      vi.useFakeTimers();
      const onLongPress = vi.fn();
      
      render(
        <LongPressHandler onLongPress={onLongPress} delay={500}>
          <div>Long Press</div>
        </LongPressHandler>
      );
      
      const element = screen.getByText('Long Press');
      fireEvent.touchStart(element);
      
      vi.advanceTimersByTime(500);
      
      expect(onLongPress).toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('does not call onLongPress if released early', () => {
      vi.useFakeTimers();
      const onLongPress = vi.fn();
      
      render(
        <LongPressHandler onLongPress={onLongPress} delay={500}>
          <div>Long Press</div>
        </LongPressHandler>
      );
      
      const element = screen.getByText('Long Press');
      fireEvent.touchStart(element);
      vi.advanceTimersByTime(200);
      fireEvent.touchEnd(element);
      vi.advanceTimersByTime(300);
      
      expect(onLongPress).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });
});
