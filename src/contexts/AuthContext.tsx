import { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { type User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import type { AuthUser, AuthState } from '@/types/auth';

const AuthContext = createContext<AuthState | null>(null);

function mapSupabaseUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email!,
    username:
      user.user_metadata?.username ||
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email!.split('@')[0],
    avatar:
      user.user_metadata?.avatar_url ||
      user.user_metadata?.picture ||
      undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const mountedRef = useRef(true);

  const login = (u: AuthUser) => {
    if (mountedRef.current) setUser(u);
  };
  const logout = () => {
    if (mountedRef.current) setUser(null);
  };

  useEffect(() => {
    mountedRef.current = true;

    // Safety #1: Check existing session (page refresh)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mountedRef.current) return;
      if (session?.user) login(mapSupabaseUser(session.user));
      setLoading(false);
    });

    // Safety #2: Listen to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;
      if (event === 'SIGNED_IN' && session?.user) {
        login(mapSupabaseUser(session.user));
        setLoading(false);
      } else if (event === 'SIGNED_OUT') {
        logout();
        setLoading(false);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        login(mapSupabaseUser(session.user));
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, setLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
