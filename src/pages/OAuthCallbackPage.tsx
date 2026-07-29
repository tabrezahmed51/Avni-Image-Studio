import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Sparkles } from 'lucide-react';

let _exchanging = false;
let _codeUsed = false;

export default function OAuthCallbackPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const url = new URL(window.location.href);
    const code = url.searchParams.get('code');
    const errorParam = url.searchParams.get('error');
    const isOAuthPopup = window.name === 'onspace-oauth';

    if (errorParam) {
      if (isOAuthPopup && window.opener) {
        window.opener.postMessage({ type: 'OAUTH_ERROR', error: errorParam }, '*');
        window.close();
      } else {
        navigate('/auth?error=' + encodeURIComponent(errorParam), { replace: true });
      }
      return;
    }

    if (code) {
      if (isOAuthPopup && window.opener) {
        // Relay code to opener — don't exchange here
        window.opener.postMessage({ type: 'OAUTH_CODE', code }, window.location.origin);
        window.close();
        return;
      }
      // Standalone: exchange the code
      if (!_codeUsed && !_exchanging) {
        _exchanging = true;
        _codeUsed = true;
        supabase.auth.exchangeCodeForSession(code).then(({ data }) => {
          _exchanging = false;
          if (data?.user) {
            login({
              id: data.user.id,
              email: data.user.email!,
              username: data.user.user_metadata?.full_name || data.user.user_metadata?.name || data.user.email!.split('@')[0],
              avatar: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture,
            });
          }
          navigate('/', { replace: true });
        }).catch(() => {
          _exchanging = false;
          navigate('/auth', { replace: true });
        });
      }
    } else {
      navigate('/auth', { replace: true });
    }
  }, [login, navigate]);

  return (
    <div className="min-h-screen bg-background mesh-bg flex flex-col items-center justify-center">
      <div className="w-14 h-14 studio-gradient rounded-2xl flex items-center justify-center mb-4 glow-violet">
        <Sparkles className="w-7 h-7 text-white animate-pulse" />
      </div>
      <p className="text-sm text-muted-foreground">Completing sign-in…</p>
    </div>
  );
}
