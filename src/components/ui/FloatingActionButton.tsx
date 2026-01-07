/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Floating Action Button (FAB) - Botão de ação flutuante mobile
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Plus, X } from 'lucide-react';

interface FABAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}

interface FloatingActionButtonProps {
  actions?: FABAction[];
  onClick?: () => void;
  icon?: React.ReactNode;
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'bottom-center';
}

export function FloatingActionButton({
  actions,
  onClick,
  icon = <Plus className="w-6 h-6" />,
  className,
  position = 'bottom-right'
}: FloatingActionButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const positionClasses = {
    'bottom-right': 'bottom-20 right-4 md:bottom-6 md:right-6',
    'bottom-left': 'bottom-20 left-4 md:bottom-6 md:left-6',
    'bottom-center': 'bottom-20 left-1/2 -translate-x-1/2 md:bottom-6'
  };

  const handleClick = () => {
    if (actions && actions.length > 0) {
      setIsOpen(!isOpen);
    } else if (onClick) {
      onClick();
    }
  };

  const handleActionClick = (action: FABAction) => {
    action.onClick();
    setIsOpen(false);
  };

  return (
    <div className={cn("fixed z-50", positionClasses[position], className)}>
      <AnimatePresence>
        {isOpen && actions && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-16 right-0 flex flex-col-reverse gap-3 mb-2"
          >
            {actions.map((action, index) => (
              <motion.button
                key={index}
                initial={{ opacity: 0, scale: 0.5, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  scale: 1, 
                  y: 0,
                  transition: { delay: index * 0.05 }
                }}
                exit={{ 
                  opacity: 0, 
                  scale: 0.5, 
                  y: 20,
                  transition: { delay: (actions.length - index) * 0.03 }
                }}
                onClick={() => handleActionClick(action)}
                className="flex items-center gap-3 group"
              >
                <span className="px-3 py-1.5 bg-card rounded-lg shadow-lg text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {action.label}
                </span>
                <div 
                  className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-110",
                    action.color || "bg-secondary text-secondary-foreground"
                  )}
                >
                  {action.icon}
                </div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={handleClick}
        className={cn(
          "w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-lg",
          "flex items-center justify-center",
          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
        )}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? <X className="w-6 h-6" /> : icon}
        </motion.div>
      </motion.button>
    </div>
  );
}

// Mini FAB variant
interface MiniFABProps {
  icon: React.ReactNode;
  onClick: () => void;
  label?: string;
  className?: string;
}

export function MiniFAB({ icon, onClick, label, className }: MiniFABProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "w-10 h-10 rounded-full bg-secondary text-secondary-foreground shadow-md",
        "flex items-center justify-center",
        "focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2",
        className
      )}
      aria-label={label}
    >
      {icon}
    </motion.button>
  );
}

// Extended FAB with label
interface ExtendedFABProps {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  className?: string;
  expanded?: boolean;
}

export function ExtendedFAB({ 
  icon, 
  label, 
  onClick, 
  className,
  expanded = true 
}: ExtendedFABProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "h-14 rounded-full bg-primary text-primary-foreground shadow-lg",
        "flex items-center justify-center gap-2 px-6",
        "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
        className
      )}
    >
      {icon}
      <AnimatePresence>
        {expanded && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            className="font-medium whitespace-nowrap overflow-hidden"
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
