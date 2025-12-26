/**
 * Contextual Help
 */
import React, { useState } from 'react';
import { HelpCircle, X } from 'lucide-react';
export const ContextualHelp: React.FC<{ title: string; content: string }> = ({ title, content }) => {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button onClick={() => setIsOpen(!isOpen)} className="p-1 rounded-full hover:bg-accent"><HelpCircle className="h-4 w-4 text-muted-foreground" /></button>
      {isOpen && (
        <div className="absolute z-50 bottom-full right-0 mb-2 w-64 bg-popover border rounded-lg shadow-lg p-3">
          <div className="flex items-center justify-between mb-2"><h4 className="font-medium">{title}</h4><button onClick={() => setIsOpen(false)}><X className="h-4 w-4" /></button></div>
          <p className="text-sm text-muted-foreground">{content}</p>
        </div>
      )}
    </div>
  );
};
export default ContextualHelp;
