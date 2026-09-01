import { ReactNode } from 'react';
import { motion, AnimatePresence, type Transition } from 'framer-motion';

interface AnimatedTransitionProps {
  loading: boolean;
  skeleton: ReactNode;
  children: ReactNode;
  className?: string;
}

const variants = {
  initial: { opacity: 0, y: 8, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -4, scale: 0.99 },
};

const transition: Transition = { duration: 0.35, ease: [0.4, 0, 0.2, 1] };

export function AnimatedTransition({
  loading,
  skeleton,
  children,
  className,
}: AnimatedTransitionProps) {
  return (
    <div className={className} style={{ position: 'relative' }}>
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="skeleton"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition}
          >
            {skeleton}
          </motion.div>
        ) : (
          <motion.div
            key="content"
            variants={variants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={transition}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
