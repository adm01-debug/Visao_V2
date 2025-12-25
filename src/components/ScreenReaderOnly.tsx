import { ReactNode } from 'react';

interface ScreenReaderOnlyProps {
  children: ReactNode;
  as?: 'span' | 'div' | 'p';
}

export const ScreenReaderOnly = ({ children, as: Component = 'span' }: ScreenReaderOnlyProps) => {
  return (
    <Component className="sr-only absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0">
      {children}
    </Component>
  );
};
