import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Shimmer } from './LoadingState';

interface ProgressiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  placeholderSrc?: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function ProgressiveImage({
  src,
  placeholderSrc,
  alt,
  className,
  containerClassName,
  onLoad,
  onError,
  ...props
}: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    setIsLoaded(false);
    setHasError(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  if (hasError) {
    return (
      <div className={cn(
        "flex items-center justify-center bg-muted text-muted-foreground",
        containerClassName
      )}>
        <span className="text-xs">Erro ao carregar</span>
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden", containerClassName)}>
      {!isLoaded && <Shimmer className="absolute inset-0" />}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0",
          className
        )}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
        {...props}
      />
    </div>
  );
}

// Lazy Image with Intersection Observer
interface LazyImageProps extends ProgressiveImageProps {
  threshold?: number;
  rootMargin?: string;
}

export function LazyImage({
  src,
  threshold = 0.1,
  rootMargin = "50px",
  ...props
}: LazyImageProps) {
  const [shouldLoad, setShouldLoad] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [threshold, rootMargin]);

  return (
    <div ref={containerRef}>
      {shouldLoad ? (
        <ProgressiveImage src={src} {...props} />
      ) : (
        <Shimmer className={props.containerClassName} />
      )}
    </div>
  );
}

// Avatar with fallback
interface AvatarImageProps {
  src?: string | null;
  alt: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeClasses = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-12 h-12 text-base',
  xl: 'w-16 h-16 text-lg'
};

export function AvatarImage({
  src,
  alt,
  fallback,
  size = 'md',
  className
}: AvatarImageProps) {
  const [hasError, setHasError] = useState(false);

  const initials = fallback || alt.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  if (!src || hasError) {
    return (
      <div className={cn(
        "rounded-full bg-primary/10 text-primary flex items-center justify-center font-medium",
        sizeClasses[size],
        className
      )}>
        {initials}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn("rounded-full object-cover", sizeClasses[size], className)}
      onError={() => setHasError(true)}
    />
  );
}
