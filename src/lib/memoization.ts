/**
 * Higher-Order Components for performance optimization
 */
import { memo, ComponentType, FC } from 'react';

/**
 * Creates a memoized version of a component with custom comparison
 * @param Component - Component to memoize
 * @param displayName - Optional display name for debugging
 * @param propsAreEqual - Optional custom comparison function
 */
export function withMemo<P extends object>(
  Component: ComponentType<P>,
  displayName?: string,
  propsAreEqual?: (prevProps: Readonly<P>, nextProps: Readonly<P>) => boolean
): FC<P> {
  const MemoizedComponent = memo(Component, propsAreEqual);
  MemoizedComponent.displayName = displayName || `Memo(${Component.displayName || Component.name || 'Component'})`;
  return MemoizedComponent;
}

/**
 * Shallow comparison for simple props
 */
export function shallowEqual<T extends object>(prevProps: T, nextProps: T): boolean {
  const prevKeys = Object.keys(prevProps) as (keyof T)[];
  const nextKeys = Object.keys(nextProps) as (keyof T)[];
  
  if (prevKeys.length !== nextKeys.length) return false;
  
  return prevKeys.every(key => prevProps[key] === nextProps[key]);
}

/**
 * Deep comparison for complex props (use sparingly)
 */
export function deepEqual<T>(a: T, b: T): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object' || a === null || b === null) return false;
  
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  
  if (keysA.length !== keysB.length) return false;
  
  return keysA.every(key => deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key]));
}

/**
 * Comparison that ignores function props (useful for callbacks)
 */
export function compareIgnoringFunctions<T extends object>(prevProps: T, nextProps: T): boolean {
  const prevKeys = Object.keys(prevProps) as (keyof T)[];
  
  return prevKeys.every(key => {
    if (typeof prevProps[key] === 'function') return true;
    return prevProps[key] === nextProps[key];
  });
}
