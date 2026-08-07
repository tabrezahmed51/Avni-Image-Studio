import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

export type AdminRole = 'superadmin' | 'admin' | 'moderator' | null;

interface AdminRoleState {
  role: AdminRole;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  loading: boolean;
}

export function useAdminRole(): AdminRoleState {
  const { user } = useAuth();
  const [role, setRole] = useState<AdminRole>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setRole(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    supabase
      .from('admin_users')
      .select('role')
      .eq('user_id', user.id)
      .single()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (!error && data?.role) {
          setRole(data.role as AdminRole);
        } else {
          setRole(null);
        }
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [user]);

  return {
    role,
    isAdmin: role !== null,
    isSuperAdmin: role === 'superadmin',
    loading,
  };
}
