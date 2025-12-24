import React, { useState } from "react";
import { cn } from "@/lib/utils";

interface TooltipProps {
  children: React.ReactNode;
  content: string;
  position?: "top" | "bottom" | "left" | "right";
  delay?: number;
}

export function Tooltip({ children, content, position = "top", delay = 200 }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  let timeout: ReturnType<typeof setTimeout>;

  const show = () => { timeout = setTimeout(() => setVisible(true), delay); };
  const hide = () => { clearTimeout(timeout); setVisible(false); };

  const positions = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div className="relative inline-block" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div className={cn("absolute z-50 px-2 py-1 text-xs text-white bg-gray-900 rounded whitespace-nowrap", positions[position])}>
          {content}
        </div>
      )}
    </div>
  );
}

export default Tooltip;
