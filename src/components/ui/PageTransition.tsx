import { ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
}

const pageVariants = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
};

const reducedVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const pageTransition = {
  duration: 0.25,
  ease: [0.25, 0.1, 0.25, 1],
};

const reducedTransition = {
  duration: 0.15,
  ease: 'easeOut',
};

export function PageTransition({ children, className }: PageTransitionProps) {
  const location = useLocation();
  const prefersReducedMotion = useReducedMotion();

  return (
    <motion.div
      key={location.pathname}
      variants={prefersReducedMotion ? reducedVariants : pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={prefersReducedMotion ? reducedTransition : pageTransition}
      className={className}
    >
      {children}
    </motion.div>
  );
}
