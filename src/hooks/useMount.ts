import { useEffect } from 'react';

export const useMount = (callback: () => void | (() => void)): void => {
  useEffect(() => {
    return callback();
  }, []);
};
