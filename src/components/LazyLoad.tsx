/**
 * Componente LazyLoad - Carrega conteúdo apenas quando visível
 */

import { ReactNode, Suspense } from "react";
import { useInView } from "@/hooks/usePerformance";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface LazyLoadProps {
  children: ReactNode;
  fallback?: ReactNode;
  className?: string;
  threshold?: number;
  rootMargin?: string;
}

export function LazyLoad({
  children,
  fallback,
  className,
  threshold = 0.1,
  rootMargin = "100px",
}: LazyLoadProps) {
  const [ref, isInView] = useInView<HTMLDivElement>({
    threshold,
    rootMargin,
    triggerOnce: true,
  });

  return (
    <div ref={ref} className={cn("min-h-[100px]", className)}>
      {isInView ? (
        <Suspense fallback={fallback || <Skeleton className="h-full w-full min-h-[100px]" />}>
          {children}
        </Suspense>
      ) : (
        fallback || <Skeleton className="h-full w-full min-h-[100px]" />
      )}
    </div>
  );
}

/**
 * Componente para lazy load de imagens com blur-up
 */
interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholderColor?: string;
}

export function LazyImage({
  src,
  alt,
  className,
  placeholderColor = "bg-muted",
}: LazyImageProps) {
  const [ref, isInView] = useInView<HTMLDivElement>({
    threshold: 0,
    rootMargin: "50px",
    triggerOnce: true,
  });

  return (
    <div ref={ref} className={cn("relative overflow-hidden", className)}>
      {!isInView ? (
        <div className={cn("absolute inset-0 animate-pulse", placeholderColor)} />
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={cn("w-full h-full object-cover transition-opacity duration-300", className)}
          onLoad={(e) => {
            (e.target as HTMLImageElement).style.opacity = "1";
          }}
          style={{ opacity: 0 }}
        />
      )}
    </div>
  );
}
