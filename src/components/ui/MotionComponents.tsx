/**
 * MotionComponents (Refactored)
 * Variants extracted to ./motion/motionVariants.ts
 */
import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '@/lib/utils';

// Re-export all variants
export { fadeInUp, fadeIn, scaleIn, slideInRight, slideInLeft, slideInBottom, staggerContainer, staggerItem } from './motion/motionVariants';

// MotionCard
interface MotionCardProps extends HTMLMotionProps<'div'> { hover?: boolean; tap?: boolean; }
export function MotionCard({ children, className, hover = true, tap = true, ...props }: MotionCardProps) {
  return (
    <motion.div className={cn('rounded-lg border border-border bg-card p-4 transition-colors', hover && 'hover:border-primary/50 hover:bg-card/80', className)}
      whileHover={hover ? { y: -2, boxShadow: '0 8px 30px -10px hsl(var(--primary) / 0.15)' } : undefined}
      whileTap={tap ? { scale: 0.98 } : undefined} transition={{ type: 'spring', stiffness: 400, damping: 25 }} {...props}>{children}</motion.div>
  );
}

// MotionButton
interface MotionButtonProps extends HTMLMotionProps<'button'> { variant?: 'primary' | 'secondary' | 'ghost' | 'destructive'; }
export function MotionButton({ children, className, variant = 'primary', ...props }: MotionButtonProps) {
  const v = { primary: 'bg-primary text-primary-foreground hover:bg-primary/90', secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80', ghost: 'bg-transparent hover:bg-accent hover:text-accent-foreground', destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90' };
  return <motion.button className={cn('px-4 py-2 rounded-md font-medium text-sm transition-colors', v[variant], className)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} transition={{ type: 'spring', stiffness: 400, damping: 17 }} {...props}>{children}</motion.button>;
}

// MotionList & Item
import { staggerContainer, staggerItem } from './motion/motionVariants';
export function MotionList({ children, className }: { children: React.ReactNode; className?: string }) {
  return <motion.div className={className} variants={staggerContainer} initial="hidden" animate="visible">{children}</motion.div>;
}
interface MotionListItemProps extends HTMLMotionProps<'div'> {}
export function MotionListItem({ children, className, ...props }: MotionListItemProps) {
  return <motion.div className={className} variants={staggerItem} {...props}>{children}</motion.div>;
}

// PulseIndicator
interface PulseIndicatorProps { color?: 'success' | 'warning' | 'destructive' | 'primary'; size?: 'sm' | 'md' | 'lg'; className?: string; }
export function PulseIndicator({ color = 'success', size = 'md', className }: PulseIndicatorProps) {
  const c = { success: 'bg-success', warning: 'bg-warning', destructive: 'bg-destructive', primary: 'bg-primary' };
  const s = { sm: 'w-2 h-2', md: 'w-3 h-3', lg: 'w-4 h-4' };
  return (
    <span className={cn('relative flex', s[size], className)}>
      <motion.span className={cn('absolute inline-flex h-full w-full rounded-full opacity-75', c[color])} animate={{ scale: [1, 1.5, 1], opacity: [0.75, 0, 0.75] }} transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} />
      <span className={cn('relative inline-flex rounded-full', s[size], c[color])} />
    </span>
  );
}

// RippleButton
interface RippleButtonProps extends HTMLMotionProps<'button'> { rippleColor?: string; }
export function RippleButton({ children, className, rippleColor = 'hsl(var(--primary-foreground) / 0.3)', onClick, ...props }: RippleButtonProps) {
  const [ripples, setRipples] = React.useState<{ x: number; y: number; id: number }[]>([]);
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect(); const id = Date.now();
    setRipples(prev => [...prev, { x: e.clientX - rect.left, y: e.clientY - rect.top, id }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);
    onClick?.(e);
  };
  return (
    <motion.button className={cn('relative overflow-hidden px-4 py-2 rounded-md font-medium bg-primary text-primary-foreground', className)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleClick} {...props}>
      {ripples.map(r => <motion.span key={r.id} className="absolute rounded-full pointer-events-none" style={{ left: r.x, top: r.y, backgroundColor: rippleColor }} initial={{ width: 0, height: 0, x: 0, y: 0, opacity: 0.5 }} animate={{ width: 300, height: 300, x: -150, y: -150, opacity: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }} />)}
      <span className="relative z-10">{children as React.ReactNode}</span>
    </motion.button>
  );
}

// PageTransition
export function PageTransition({ children, className }: { children: React.ReactNode; className?: string }) {
  return <motion.div className={className} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.3, ease: 'easeOut' }}>{children}</motion.div>;
}

// AnimatedNumber
export function AnimatedNumber({ value, duration = 1, className, prefix = '', suffix = '' }: { value: number; duration?: number; className?: string; prefix?: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = React.useState(0);
  React.useEffect(() => {
    let startTime: number; let animationFrame: number;
    const animate = (timestamp: number) => { if (!startTime) startTime = timestamp; const p = Math.min((timestamp - startTime) / (duration * 1000), 1); setDisplayValue(Math.floor(p * value)); if (p < 1) animationFrame = requestAnimationFrame(animate); };
    animationFrame = requestAnimationFrame(animate); return () => cancelAnimationFrame(animationFrame);
  }, [value, duration]);
  return <span className={className}>{prefix}{displayValue.toLocaleString()}{suffix}</span>;
}

// Fab
interface FabProps extends HTMLMotionProps<'button'> { icon: React.ReactNode; label?: string; }
export function Fab({ icon, label, className, ...props }: FabProps) {
  return (
    <motion.button className={cn('fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-shadow', className)}
      whileHover={{ scale: 1.05, y: -2 }} whileTap={{ scale: 0.95 }} initial={{ opacity: 0, scale: 0.5, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 20 }} {...props}>
      {icon}{label && <span className="font-medium text-sm">{label}</span>}
    </motion.button>
  );
}
