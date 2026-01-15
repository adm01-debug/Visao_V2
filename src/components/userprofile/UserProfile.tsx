/**
 * VIS-O - Sistema de Vigilância Inteligente
 * UserProfile - User profile display component
 * 
 * @module components/userprofile
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface UserProfileProps {
  className?: string;
  children?: React.ReactNode;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  className,
  children,
}) => {
  return (
    <div className={cn("userprofile", className)}>
      {children}
    </div>
  );
};

UserProfile.displayName = 'UserProfile';

export default UserProfile;
