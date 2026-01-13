/**
 * VISÃO - Sistema de Vigilância Inteligente
 * Skip Link Component for Accessibility
 */

import { memo } from "react";
import { cn } from "@/lib/utils";

interface SkipLinkProps {
  targetId: string;
  className?: string;
  children?: React.ReactNode;
}

function SkipLinkComponent({
  targetId,
  className,
  children = "Pular para conteúdo principal",
}: SkipLinkProps) {
  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    const target = document.getElementById(targetId);
    if (target) {
      target.focus();
      target.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <a
      href={`#${targetId}`}
      onClick={handleClick}
      className={cn(
        "sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4",
        "focus:bg-primary focus:text-primary-foreground focus:px-4 focus:py-2 focus:rounded-md",
        "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        className
      )}
    >
      {children}
    </a>
  );
}

export const SkipLink = memo(SkipLinkComponent);
export default SkipLink;
