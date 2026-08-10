import React, { ReactNode } from 'react';

interface VisuallyHiddenProps {
  children: ReactNode;
  as?: 'span' | 'div';
}

export const VisuallyHidden: React.FC<VisuallyHiddenProps> = ({ children, as: Tag = 'span' }) => (
  <Tag className="sr-only">{children}</Tag>
);

export default VisuallyHidden;
