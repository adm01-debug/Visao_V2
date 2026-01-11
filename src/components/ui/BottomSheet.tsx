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
  isOpen,
  onClose,
  children,
  title,
  snapPoints = [0.5, 0.9],
  initialSnap = 0,
  className,
  showHandle = true,
  closeOnOverlayClick = true,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null);
  const [windowHeight, setWindowHeight] = useState(typeof window !== 'undefined' ? window.innerHeight : 800);
  const [currentSnap, setCurrentSnap] = useState(initialSnap);
  
  const y = useMotionValue(0);
  const overlayOpacity = useTransform(
    y,
    [0, windowHeight * (1 - snapPoints[0])],
    [0.5, 0]
  );

  useEffect(() => {
    const handleResize = () => setWindowHeight(window.innerHeight);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const getSnapHeight = (snapIndex: number) => {
    return windowHeight * snapPoints[snapIndex];
  };

  const handleDragEnd = useCallback(
    (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
      const velocity = info.velocity.y;
      const offset = info.offset.y;
      
      // Close if dragged down fast or past threshold
      if (velocity > 500 || offset > getSnapHeight(0) * 0.5) {
        onClose();
        return;
      }

      // Snap to nearest point
      const currentHeight = getSnapHeight(currentSnap) - offset;
      let nearestSnap = 0;
      let minDistance = Infinity;

      snapPoints.forEach((_, index) => {
        const snapHeight = getSnapHeight(index);
        const distance = Math.abs(currentHeight - snapHeight);
        if (distance < minDistance) {
          minDistance = distance;
          nearestSnap = index;
        }
      });

      setCurrentSnap(nearestSnap);
    },
    [currentSnap, snapPoints, onClose]
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            className="fixed inset-0 bg-black z-40"
            style={{ opacity: overlayOpacity }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={closeOnOverlayClick ? onClose : undefined}
          />

          {/* Sheet */}
          <motion.div
            ref={sheetRef}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50',
              'bg-background rounded-t-2xl shadow-2xl',
              'flex flex-col max-h-[95vh]',
              className
            )}
            style={{ y }}
            initial={{ y: '100%' }}
            animate={{ 
              y: 0,
              height: getSnapHeight(currentSnap)
            }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={handleDragEnd}
          >
            {/* Handle */}
            {showHandle && (
              <div className="flex justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing">
                <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
              </div>
            )}

            {/* Header */}
            {title && (
              <div className="flex items-center justify-between px-4 py-2 border-b border-border">
                <h3 className="font-semibold text-lg">{title}</h3>
                <motion.button
                  className="p-2 rounded-full hover:bg-muted transition-colors"
                  onClick={onClose}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            )}

            {/* Content */}
            <div className="flex-1 overflow-auto overscroll-contain">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ============================================
// FILTER BOTTOM SHEET
// ============================================

interface FilterOption {
  id: string;
  label: string;
  value: string | number | boolean;
}

interface FilterGroup {
  id: string;
  label: string;
  type: 'single' | 'multi' | 'range';
  options?: FilterOption[];
  range?: { min: number; max: number };
}

interface FilterBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterGroup[];
  values: Record<string, any>;
  onChange: (values: Record<string, any>) => void;
  onApply: () => void;
  onReset: () => void;
}

export function FilterBottomSheet({
  isOpen,
  onClose,
  filters,
  values,
  onChange,
  onApply,
  onReset,
}: FilterBottomSheetProps) {
  const handleValueChange = (groupId: string, value: unknown) => {
    onChange({ ...values, [groupId]: value });
  };

  const handleMultiToggle = (groupId: string, optionValue: unknown) => {
    const current = values[groupId] || [];
    const newValue = current.includes(optionValue)
      ? current.filter((v: unknown) => v !== optionValue)
      : [...current, optionValue];
    handleValueChange(groupId, newValue);
  };

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Filtros"
      snapPoints={[0.6, 0.9]}
    >
      <div className="p-4 space-y-6">
        {filters.map((group) => (
          <div key={group.id} className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              {group.label}
            </h4>

            {/* Single Select */}
            {group.type === 'single' && group.options && (
              <div className="flex flex-wrap gap-2">
                {group.options.map((option) => (
                  <motion.button
                    key={option.id}
                    className={cn(
                      'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                      values[group.id] === option.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    )}
                    onClick={() => handleValueChange(group.id, option.value)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {option.label}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Multi Select */}
            {group.type === 'multi' && group.options && (
              <div className="flex flex-wrap gap-2">
                {group.options.map((option) => {
                  const isSelected = (values[group.id] || []).includes(option.value);
                  return (
                    <motion.button
                      key={option.id}
                      className={cn(
                        'px-4 py-2 rounded-full text-sm font-medium transition-colors',
                        isSelected
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      )}
                      onClick={() => handleMultiToggle(group.id, option.value)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      {option.label}
                    </motion.button>
                  );
                })}
              </div>
            )}

            {/* Range */}
            {group.type === 'range' && group.range && (
              <div className="px-2">
                <input
                  type="range"
                  min={group.range.min}
                  max={group.range.max}
                  value={values[group.id] || group.range.min}
                  onChange={(e) => handleValueChange(group.id, parseInt(e.target.value))}
                  className="w-full accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>{group.range.min}</span>
                  <span className="font-medium text-foreground">
                    {values[group.id] || group.range.min}
                  </span>
                  <span>{group.range.max}</span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Actions */}
      <div className="sticky bottom-0 p-4 border-t border-border bg-background flex gap-3">
        <motion.button
          className="flex-1 py-3 rounded-lg border border-border text-muted-foreground font-medium"
          onClick={onReset}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Limpar
        </motion.button>
        <motion.button
          className="flex-1 py-3 rounded-lg bg-primary text-primary-foreground font-medium"
          onClick={() => {
            onApply();
            onClose();
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Aplicar
        </motion.button>
      </div>
    </BottomSheet>
  );
}

// ============================================
// ACTION SHEET
// ============================================

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

export function ActionSheet({
  isOpen,
  onClose,
  title,
  options,
}: ActionSheetProps) {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      snapPoints={[0.4]}
      showHandle={true}
    >
      <div className="p-4">
        {title && (
          <p className="text-sm text-muted-foreground text-center mb-4">
            {title}
          </p>
        )}

        <div className="space-y-1">
          {options.map((option) => (
            <motion.button
              key={option.id}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                option.destructive
                  ? 'text-destructive hover:bg-destructive/10'
                  : 'text-foreground hover:bg-muted'
              )}
              onClick={() => {
                option.onSelect();
                onClose();
              }}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
            >
              {option.icon}
              <span className="font-medium">{option.label}</span>
            </motion.button>
          ))}
        </div>

        <motion.button
          className="w-full mt-4 py-3 rounded-lg bg-muted text-muted-foreground font-medium"
          onClick={onClose}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          Cancelar
        </motion.button>
      </div>
    </BottomSheet>
  );
}
