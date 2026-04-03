import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'manager' | 'operator' | 'viewer';

interface UseUserRoleReturn {
  role: AppRole;
  loading: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isOperator: boolean;
  isViewer: boolean;
  hasMinRole: (minRole: AppRole) => boolean;
  refetch: () => Promise<void>;
}

const ROLE_HIERARCHY: Record<AppRole, number> = {
  admin: 100,
  manager: 75,
  operator: 50,
  viewer: 25,
};

export function useUserRole(): UseUserRoleReturn {
  const { user } = useAuth();
  const [role, setRole] = useState<AppRole>('viewer');
  const [loading, setLoading] = useState(true);

  const fetchRole = async () => {
    if (!user?.id) {
      setRole('viewer');
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .order('role')
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error('Error fetching user role:', error);
        setRole('viewer');
      } else {
        setRole((data?.role as AppRole) || 'viewer');
      }
    } catch {
      setRole('viewer');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRole();
  }, [user?.id]);

  const hasMinRole = (minRole: AppRole): boolean => {
    return ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[minRole];
  };

  return {
    role,
    loading,
    isAdmin: role === 'admin',
    isManager: hasMinRole('manager'),
    isOperator: hasMinRole('operator'),
    isViewer: true,
    hasMinRole,
    refetch: fetchRole,
  };
}
