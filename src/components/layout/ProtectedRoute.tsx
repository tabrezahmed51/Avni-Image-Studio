import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles } from 'lucide-react';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background mesh-bg flex flex-col items-center justify-center">
        <div className="w-12 h-12 studio-gradient rounded-2xl flex items-center justify-center mb-3 glow-violet">
          <Sparkles className="w-6 h-6 text-white animate-pulse" />
        </div>
        <p className="text-xs text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}
