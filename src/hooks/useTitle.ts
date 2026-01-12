import { useEffect, useRef } from 'react';

const DEFAULT_TITLE = 'VIS-O';

export function useTitle(title: string, restoreOnUnmount = true): void {
  const previousTitle = useRef(document.title);

  useEffect(() => {
    document.title = title ? `${title} | ${DEFAULT_TITLE}` : DEFAULT_TITLE;
  }, [title]);

  useEffect(() => {
    if (restoreOnUnmount) {
      return () => {
        document.title = previousTitle.current;
      };
    }
  }, [restoreOnUnmount]);
}

export default useTitle;
