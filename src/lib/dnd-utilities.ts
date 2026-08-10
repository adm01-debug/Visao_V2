/**
 * VISÃO - Local shim for @dnd-kit/utilities
 * Provides the minimal `CSS.Transform.toString` helper used by widget wrappers,
 * avoiding a hard dependency on the unresolved `@dnd-kit/utilities` package.
 */
export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
}

export const CSS = {
  Transform: {
    toString(transform: Transform | null | undefined): string | undefined {
      if (!transform) return undefined;
      const { x, y, scaleX, scaleY } = transform;
      return `translate3d(${x}px, ${y}px, 0) scaleX(${scaleX}) scaleY(${scaleY})`;
    },
  },
  Translate: {
    toString(transform: { x: number; y: number } | null | undefined): string | undefined {
      if (!transform) return undefined;
      return `translate3d(${transform.x}px, ${transform.y}px, 0)`;
    },
  },
};
