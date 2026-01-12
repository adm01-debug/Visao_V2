import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CollapseTextProps {
  text: string;
  maxLines?: number;
  className?: string;
}

export function CollapseText({ text, maxLines = 3, className }: CollapseTextProps) {
  const [expanded, setExpanded] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (ref.current) {
      const lineHeight = parseInt(getComputedStyle(ref.current).lineHeight);
      setShowButton(ref.current.scrollHeight > lineHeight * maxLines);
    }
  }, [text, maxLines]);

  return (
    <div className={className}>
      <div ref={ref} className={cn(!expanded && `line-clamp-${maxLines}`)} style={{ WebkitLineClamp: expanded ? 'unset' : maxLines }}>
        {text}
      </div>
      {showButton && (
        <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 text-sm text-primary mt-1">
          {expanded ? <><ChevronUp className="h-4 w-4" />Ver menos</> : <><ChevronDown className="h-4 w-4" />Ver mais</>}
        </button>
      )}
    </div>
  );
}

export default CollapseText;
