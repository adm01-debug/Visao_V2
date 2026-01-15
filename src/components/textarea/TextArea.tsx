/**
 * VIS-O - Sistema de Vigilância Inteligente
 * TextArea - Textarea component for multi-line text input
 *
 * @module components/textarea
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface TextAreaProps {
  className?: string;
  children?: React.ReactNode;
}

export const TextArea: React.FC<TextAreaProps> = ({
  className,
  children,
}) => {
  return (
    <div className={cn("textarea", className)}>
      {children}
    </div>
  );
};

TextArea.displayName = 'TextArea';

export default TextArea;
