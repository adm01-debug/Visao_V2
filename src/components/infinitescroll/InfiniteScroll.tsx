import React, { useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface InfiniteScrollProps { children: React.ReactNode; onLoadMore: () => void; loading?: boolean; hasMore?: boolean; className?: string; }

export function InfiniteScroll({ children, onLoadMore, loading = false, hasMore = true, className }: InfiniteScrollProps) {
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore || loading) return;
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) onLoadMore(); });
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loading, onLoadMore]);

  return (
    <div className={className}>{children}
      {hasMore && <div ref={loaderRef} className="flex justify-center py-4">{loading && <Loader2 className="h-6 w-6 animate-spin" />}</div>}
    </div>
  );
}

export default InfiniteScroll;
