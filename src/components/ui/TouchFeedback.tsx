/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Touch Feedback Components - Feedback visual para interações touch
 */

import React, { forwardRef, useState, useCallback } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

// Ripple Effect Component
interface RippleProps {
  x: number;
  y: number;
  size: number;
}

function Ripple({ x, y, size }: RippleProps) {
  return (
    <motion.span
      initial={{ scale: 0, opacity: 0.5 }}
      animate={{ scale: 1, opacity: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="absolute rounded-full bg-current pointer-events-none"
      style={{
        left: x - size / 2,
        top: y - size / 2,
        width: size,
        height: size,
      }}
    />
  );
}

// Touchable Component with Ripple Effect
interface TouchableProps extends Omit<HTMLMotionProps<"button">, 'onTouchStart'> {
  children: React.ReactNode;
  rippleColor?: string;
  disabled?: boolean;
  as?: 'button' | 'div';
}

export const Touchable = forwardRef<HTMLButtonElement, TouchableProps>(
  ({ children, className, rippleColor, disabled, as = 'button', onClick, ...props }, ref) => {
    const [ripples, setRipples] = useState<RippleProps[]>([]);

    const handleClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled) return;
      
      const rect = e.currentTarget.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const newRipple = { x, y, size };
      setRipples(prev => [...prev, newRipple]);
      
      setTimeout(() => {
        setRipples(prev => prev.slice(1));
      }, 600);
      
      onClick?.(e);
    }, [disabled, onClick]);

    const Component = motion.button;

    return (
      <Component
        ref={ref}
        className={cn(
          "relative overflow-hidden",
          disabled && "opacity-50 cursor-not-allowed",
          className
        )}
        onClick={handleClick}
        whileTap={disabled ? {} : { scale: 0.98 }}
        disabled={disabled}
        {...props}
      >
        {children}
        {ripples.map((ripple, index) => (
          <Ripple key={index} {...ripple} />
        ))}
      </Component>
    );
  }
);

Touchable.displayName = 'Touchable';

// Press and Hold Component
interface PressAndHoldProps {
  children: React.ReactNode;
  onComplete: () => void;
  duration?: number;
  className?: string;
  progressClassName?: string;
}

export function PressAndHold({
  children,
  onComplete,
  duration = 1000,
  className,
  progressClassName
}: PressAndHoldProps) {
  const [progress, setProgress] = useState(0);
  const [isHolding, setIsHolding] = useState(false);
  const intervalRef = React.useRef<NodeJS.Timeout>();

  const startHold = useCallback(() => {
    setIsHolding(true);
    setProgress(0);
    
    const step = 16; // ~60fps
    const increment = (step / duration) * 100;
    
    intervalRef.current = setInterval(() => {
      setProgress(prev => {
        const next = prev + increment;
        if (next >= 100) {
          clearInterval(intervalRef.current);
          setIsHolding(false);
          onComplete();
          return 0;
        }
        return next;
      });
    }, step);
  }, [duration, onComplete]);

  const endHold = useCallback(() => {
    clearInterval(intervalRef.current);
    setIsHolding(false);
    setProgress(0);
  }, []);

  return (
    <motion.div
      className={cn("relative select-none cursor-pointer", className)}
      onMouseDown={startHold}
      onMouseUp={endHold}
      onMouseLeave={endHold}
      onTouchStart={startHold}
      onTouchEnd={endHold}
      whileTap={{ scale: 0.98 }}
    >
      {children}
      
      {isHolding && (
        <div className="absolute inset-0 overflow-hidden rounded-inherit">
          <motion.div
            className={cn(
              "absolute bottom-0 left-0 h-1 bg-primary",
              progressClassName
            )}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.016, ease: "linear" }}
          />
        </div>
      )}
    </motion.div>
  );
}

// Long Press Detector
interface LongPressProps {
  children: React.ReactNode;
  onLongPress: () => void;
  onPress?: () => void;
  delay?: number;
  className?: string;
}

export function LongPress({
  children,
  onLongPress,
  onPress,
  delay = 500,
  className
}: LongPressProps) {
  const timerRef = React.useRef<NodeJS.Timeout>();
  const isLongPress = React.useRef(false);

  const start = useCallback(() => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      onLongPress();
    }, delay);
  }, [delay, onLongPress]);

  const stop = useCallback(() => {
    clearTimeout(timerRef.current);
    if (!isLongPress.current && onPress) {
      onPress();
    }
  }, [onPress]);

  return (
    <div
      className={cn("select-none touch-none", className)}
      onMouseDown={start}
      onMouseUp={stop}
      onMouseLeave={stop}
      onTouchStart={start}
      onTouchEnd={stop}
    >
      {children}
    </div>
  );
}

// Double Tap Detector
interface DoubleTapProps {
  children: React.ReactNode;
  onDoubleTap: () => void;
  onSingleTap?: () => void;
  delay?: number;
  className?: string;
}

export function DoubleTap({
  children,
  onDoubleTap,
  onSingleTap,
  delay = 300,
  className
}: DoubleTapProps) {
  const lastTap = React.useRef<number>(0);
  const timerRef = React.useRef<NodeJS.Timeout>();

  const handleTap = useCallback(() => {
    const now = Date.now();
    const timeDiff = now - lastTap.current;
    
    clearTimeout(timerRef.current);
    
    if (timeDiff < delay && timeDiff > 0) {
      onDoubleTap();
      lastTap.current = 0;
    } else {
      lastTap.current = now;
      if (onSingleTap) {
        timerRef.current = setTimeout(() => {
          onSingleTap();
          lastTap.current = 0;
        }, delay);
      }
    }
  }, [delay, onDoubleTap, onSingleTap]);

  return (
    <div
      className={cn("select-none", className)}
      onClick={handleTap}
    >
      {children}
    </div>
  );
}

// Scale on Press
interface ScaleOnPressProps {
  children: React.ReactNode;
  scale?: number;
  className?: string;
  onClick?: () => void;
}

export function ScaleOnPress({ 
  children, 
  scale = 0.95, 
  className,
  onClick 
}: ScaleOnPressProps) {
  return (
    <motion.div
      className={cn("cursor-pointer", className)}
      whileTap={{ scale }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  );
}
