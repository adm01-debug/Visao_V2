import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BottomSheet } from '../BottomSheet';

interface ActionSheetOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  onSelect: () => void;
}

interface ActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  options: ActionSheetOption[];
}

export function ActionSheet({ isOpen, onClose, title, options }: ActionSheetProps) {
  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} snapPoints={[0.4]} showHandle={true}>
      <div className="p-4">
        {title && <p className="text-sm text-muted-foreground text-center mb-4">{title}</p>}
        <div className="space-y-1">
          {options.map((option) => (
            <motion.button key={option.id} className={cn('w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors', option.destructive ? 'text-destructive hover:bg-destructive/10' : 'text-foreground hover:bg-muted')} onClick={() => { option.onSelect(); onClose(); }} whileHover={{ x: 4 }} whileTap={{ scale: 0.98 }}>
              {option.icon}
              <span className="font-medium">{option.label}</span>
            </motion.button>
          ))}
        </div>
        <motion.button className="w-full mt-4 py-3 rounded-lg bg-muted text-muted-foreground font-medium" onClick={onClose} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>Cancelar</motion.button>
      </div>
    </BottomSheet>
  );
}
