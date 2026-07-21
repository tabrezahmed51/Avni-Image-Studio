import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/contexts/AuthContext';
import ProtectedRoute from '@/components/layout/ProtectedRoute';
import HomePage from '@/pages/HomePage';
import AuthPage from '@/pages/AuthPage';
import OAuthCallbackPage from '@/pages/OAuthCallbackPage';
import AdminPage from '@/pages/AdminPage';
import NotFound from '@/pages/NotFound';

// Robots / crawler meta tag is in index.html
// Additional security: block iframe embedding via CSP in index.html

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'hsl(240, 12%, 8%)',
              color: 'hsl(280, 20%, 96%)',
              border: '1px solid hsl(240, 10%, 16%)',
            },
          }}
        />
        <Routes>
          {/* Public routes */}
          <Route path="/auth" element={<AuthPage />} />
          <Route path="/auth/callback" element={<OAuthCallbackPage />} />

          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <HomePage />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute>
              <AdminPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/*" element={<Navigate to="/admin" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}
