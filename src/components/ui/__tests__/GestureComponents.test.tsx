import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { GestureComponents, Draggable, Pinchable, Rotatable } from '../GestureComponents';

describe('GestureComponents', () => {
  describe('Draggable', () => {
    it('renders children correctly', () => {
      render(
        <Draggable>
          <div>Draggable Content</div>
        </Draggable>
      );
      expect(screen.getByText('Draggable Content')).toBeInTheDocument();
    });

    it('calls onDragStart when drag begins', () => {
      const onDragStart = vi.fn();
      render(
        <Draggable onDragStart={onDragStart}>
          <div>Drag Me</div>
        </Draggable>
      );
      
      const element = screen.getByText('Drag Me');
      fireEvent.mouseDown(element, { clientX: 0, clientY: 0 });
      
      expect(onDragStart).toHaveBeenCalled();
    });

    it('calls onDrag during drag movement', () => {
      const onDrag = vi.fn();
      render(
        <Draggable onDrag={onDrag}>
          <div>Drag Me</div>
        </Draggable>
      );
      
      const element = screen.getByText('Drag Me');
      fireEvent.mouseDown(element, { clientX: 0, clientY: 0 });
      fireEvent.mouseMove(element, { clientX: 50, clientY: 50 });
      
      expect(onDrag).toHaveBeenCalledWith(expect.objectContaining({ x: 50, y: 50 }));
    });

    it('calls onDragEnd when drag ends', () => {
      const onDragEnd = vi.fn();
      render(
        <Draggable onDragEnd={onDragEnd}>
          <div>Drag Me</div>
        </Draggable>
      );
      
      const element = screen.getByText('Drag Me');
      fireEvent.mouseDown(element);
      fireEvent.mouseUp(element);
      
      expect(onDragEnd).toHaveBeenCalled();
    });

    it('respects disabled prop', () => {
      const onDragStart = vi.fn();
      render(
        <Draggable onDragStart={onDragStart} disabled>
          <div>Drag Me</div>
        </Draggable>
      );
      
      const element = screen.getByText('Drag Me');
      fireEvent.mouseDown(element);
      
      expect(onDragStart).not.toHaveBeenCalled();
    });
  });

  describe('Pinchable', () => {
    it('renders children correctly', () => {
      render(
        <Pinchable onPinch={vi.fn()}>
          <div>Pinch Content</div>
        </Pinchable>
      );
      expect(screen.getByText('Pinch Content')).toBeInTheDocument();
    });

    it('calls onPinch with scale value', () => {
      const onPinch = vi.fn();
      render(
        <Pinchable onPinch={onPinch}>
          <div>Pinch Me</div>
        </Pinchable>
      );
      
      const element = screen.getByText('Pinch Me');
      fireEvent.touchStart(element, {
        touches: [
          { clientX: 0, clientY: 0 },
          { clientX: 100, clientY: 0 }
        ]
      });
      fireEvent.touchMove(element, {
        touches: [
          { clientX: 0, clientY: 0 },
          { clientX: 200, clientY: 0 }
        ]
      });
      
      expect(onPinch).toHaveBeenCalled();
    });
  });

  describe('Rotatable', () => {
    it('renders children correctly', () => {
      render(
        <Rotatable onRotate={vi.fn()}>
          <div>Rotate Content</div>
        </Rotatable>
      );
      expect(screen.getByText('Rotate Content')).toBeInTheDocument();
    });

    it('calls onRotate with angle value', () => {
      const onRotate = vi.fn();
      render(
        <Rotatable onRotate={onRotate}>
          <div>Rotate Me</div>
        </Rotatable>
      );
      
      const element = screen.getByText('Rotate Me');
      fireEvent.touchStart(element, {
        touches: [
          { clientX: 0, clientY: 0 },
          { clientX: 100, clientY: 0 }
        ]
      });
      fireEvent.touchMove(element, {
        touches: [
          { clientX: 0, clientY: 0 },
          { clientX: 0, clientY: 100 }
        ]
      });
      
      expect(onRotate).toHaveBeenCalled();
    });
  });
});
