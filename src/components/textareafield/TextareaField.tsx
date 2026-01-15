/**
 * VIS-O - Sistema de Vigilância Inteligente
 * TextareaField - Form field wrapper for textarea
 *
 * @module components/textareafield
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaFieldProps {
  className?: string;
  children?: React.ReactNode;
}

export const TextareaField: React.FC<TextareaFieldProps> = ({
  className,
  children,
}) => {
  return (
    <div className={cn("textareafield", className)}>
      {children}
    </div>
  );
};

TextareaField.displayName = 'TextareaField';

export default TextareaField;
