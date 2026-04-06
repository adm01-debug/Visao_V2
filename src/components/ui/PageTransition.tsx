import React, { ReactNode } from 'react';
import { motion, useReducedMotion, AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

/**
 * Premium crossfade page transition
 * - Full crossfade with subtle scale for depth
 * - Respects prefers-reduced-motion
 */
const crossfadeVariants = {
  initial: {
    opacity: 0,
    scale: 0.995,
    filter: 'blur(4px)',
  },
  animate: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px)',
  },
  exit: {
    opacity: 0,
    scale: 1.005,
    filter: 'blur(2px)',
  },
};

const reducedVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const crossfadeTransition = {
  duration: 0.3,
  ease: [0.22, 1, 0.36, 1],
};

const reducedTransition = {
  duration: 0.15,
  ease: 'easeOut',
};

export const PageTransition = React.forwardRef<HTMLDivElement, PageTransitionProps>(
  function PageTransition({ children, className }, _ref) {
    const location = useLocation();
    const prefersReducedMotion = useReducedMotion();

    const variants = prefersReducedMotion ? reducedVariants : crossfadeVariants;
    const transition = prefersReducedMotion ? reducedTransition : crossfadeTransition;

    return (
      <AnimatePresence mode="wait">
        <motion.div
          key={location.pathname}
          variants={variants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={transition}
          className={className}
          style={{ willChange: 'opacity, transform, filter' }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    );
  }
);

PageTransition.displayName = 'PageTransition';
