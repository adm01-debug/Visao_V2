import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
  placeholder?: React.ReactNode;
}

export const LazyImage = React.memo(function LazyImage({
  src,
  alt,
  className,
  fallback = "/placeholder.png",
  placeholder,
  ...props
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && imgRef.current) {
          imgRef.current.src = src || "";
        }
      },
      { rootMargin: "100px" }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {!isLoaded && placeholder}
      <img
        ref={imgRef}
        alt={alt}
        className={cn(
          "transition-opacity duration-300",
          isLoaded ? "opacity-100" : "opacity-0"
        )}
        onLoad={() => setIsLoaded(true)}
        onError={() => {
          setError(true);
          if (imgRef.current) imgRef.current.src = fallback;
        }}
        {...props}
      />
    </div>
  );
});

export default LazyImage;
