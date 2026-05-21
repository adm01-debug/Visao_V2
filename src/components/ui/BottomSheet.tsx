/**
 * BottomSheet (Refactored)
 * FilterBottomSheet → ./bottom-sheet/FilterBottomSheet.tsx
 * ActionSheet → ./bottom-sheet/ActionSheet.tsx
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  snapPoints?: number[];
  initialSnap?: number;
  className?: string;
  showHandle?: boolean;
  closeOnOverlayClick?: boolean;
}

export function BottomSheet({
  isOpen, onClose, children, title, snapPoints = [0.5, 0.9], initialSnap = 0,
  className, showHandle = true, closeOnOverlayClick = true,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  const [currentSnap, setCurrentSnap] = useState(initialSnap);
  const y = useMotionValue(0);
  const overlayOpacity = useTransform(y, [0, windowHeight * (1 - (snapPoints[0] ?? 0))], [0.5, 0]);

  useEffect(() => {
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const getSnapHeight = useCallback(
    (snapIndex: number) => windowHeight * (snapPoints[snapIndex] ?? 0),
    [windowHeight, snapPoints]
  );

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      if (info.velocity.y > 500 || info.offset.y > getSnapHeight(0) * 0.5) { onClose(); return; }
      const currentHeight = getSnapHeight(currentSnap) - info.offset.y;
      let nearestSnap = 0; let minDistance = Infinity;
      snapPoints.forEach((_, index) => {
        const d = Math.abs(currentHeight - getSnapHeight(index));
        if (d < minDistance) { minDistance = d; nearestSnap = index; }
      });
      setCurrentSnap(nearestSnap);
    },
    [currentSnap, snapPoints, onClose, getSnapHeight]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div className="fixed inset-0 bg-foreground z-40" style={{ opacity: overlayOpacity }} initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }} onClick={closeOnOverlayClick ? onClose : undefined} />
          <motion.div ref={sheetRef} className={cn('fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-2xl shadow-2xl flex flex-col max-h-[95vh]', className)} style={{ y }} initial={{ y: '100%' }} animate={{ y: 0, height: getSnapHeight(currentSnap) }} exit={{ y: '100%' }} transition={{ type: 'spring', damping: 30, stiffness: 300 }} drag="y" dragConstraints={{ top: 0 }} dragElastic={{ top: 0, bottom: 0.5 }} onDragEnd={handleDragEnd}>
            {showHandle && <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing"><div className="w-10 h-1 rounded-full bg-muted-foreground/30" /></div>}
            {title && (
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <h3 className="font-semibold text-lg">{title}</h3>
                <motion.button className="p-2 rounded-full hover:bg-muted transition-colors" onClick={onClose} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}><X className="w-5 h-5" /></motion.button>
              </div>
            )}
            <div className="flex-1 overflow-auto overscroll-contain">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// Re-exports
export { FilterBottomSheet } from './bottom-sheet/FilterBottomSheet';
export { ActionSheet } from './bottom-sheet/ActionSheet';
