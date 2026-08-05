import { forwardRef, useCallback } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { prefetchRoute } from '@/lib/routePrefetch';

/**
 * Drop-in replacement para `Link` do react-router-dom que dispara `import()`
 * do chunk de destino em hover / focus / touchstart. O download acontece
 * em paralelo à intenção do usuário, cortando o tempo até renderizar quando
 * o clique acontece. Sem impacto no bundle inicial — a rota permanece lazy.
 */
export const PrefetchLink = forwardRef<HTMLAnchorElement, LinkProps>(function PrefetchLink(
  { to, onMouseEnter, onFocus, onTouchStart, ...rest },
  ref
) {
  const path = typeof to === 'string' ? to : ((to as { pathname?: string }).pathname ?? '');

  const trigger = useCallback(() => {
    if (path) prefetchRoute(path);
  }, [path]);

  return (
    <Link
      ref={ref}
      to={to}
      onMouseEnter={(e) => {
        trigger();
        onMouseEnter?.(e);
      }}
      onFocus={(e) => {
        trigger();
        onFocus?.(e);
      }}
      onTouchStart={(e) => {
        trigger();
        onTouchStart?.(e);
      }}
      {...rest}
    />
  );
});
