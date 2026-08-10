import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BottomSheet } from '../BottomSheet';

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
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Filtros" snapPoints={[0.6, 0.9]}>
      <div className="p-4 space-y-6">
        {filters.map((group) => (
          <div key={group.id} className="space-y-3">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              {group.label}
            </h4>

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
