/**
 * VIS-O - Sistema de Vigilância Inteligente
 * UserMenu - User menu dropdown with profile actions
 * 
 * @module components/usermenu
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface UserMenuProps {
  className?: string;
  children?: React.ReactNode;
}

export const UserMenu: React.FC<UserMenuProps> = ({
  className,
  children,
}) => {
  return (
    <div className={cn("usermenu", className)}>
      {children}
    </div>
  );
};

UserMenu.displayName = 'UserMenu';

export default UserMenu;
