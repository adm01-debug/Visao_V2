/**
 * Pre-memoized common components for performance optimization
 * Use these in list renderings to prevent unnecessary re-renders
 */
import React, { memo } from 'react';
import { AlertCard } from './AlertCard';
import { CameraCard } from './CameraCard';
import { EventCard } from './EventCard';

/**
 * Memoized AlertCard - prevents re-render if props haven't changed
 */
export const MemoizedAlertCard = memo(AlertCard, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.status === nextProps.status &&
    prevProps.severity === nextProps.severity
  );
});
MemoizedAlertCard.displayName = 'MemoizedAlertCard';

/**
 * Memoized CameraCard - prevents re-render if props haven't changed
 */
export const MemoizedCameraCard = memo(CameraCard, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.status === nextProps.status &&
    prevProps.isOnline === nextProps.isOnline
  );
});
MemoizedCameraCard.displayName = 'MemoizedCameraCard';

/**
 * Memoized EventCard - prevents re-render if props haven't changed
 */
export const MemoizedEventCard = memo(EventCard, (prevProps, nextProps) => {
  return (
    prevProps.id === nextProps.id &&
    prevProps.type === nextProps.type
  );
});
MemoizedEventCard.displayName = 'MemoizedEventCard';

/**
 * Generic memoization wrapper
 * Usage: const MemoizedComponent = memoize(MyComponent, ['id', 'status'])
 */
export function memoize<P extends object>(
  Component: React.ComponentType<P>,
  propsToCompare: (keyof P)[]
): React.MemoExoticComponent<React.ComponentType<P>> {
  return memo(Component, (prevProps, nextProps) => {
    return propsToCompare.every(
      (prop) => prevProps[prop] === nextProps[prop]
    );
  });
}

export default {
  MemoizedAlertCard,
  MemoizedCameraCard,
  MemoizedEventCard,
  memoize,
};
