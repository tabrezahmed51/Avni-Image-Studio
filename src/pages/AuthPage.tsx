import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, Sparkles, Mail, Lock, User, ArrowRight, Shield, Brain, Zap, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';

// ── OAuth popup helpers ───────────────────────────────────────────────
function isInIframe(): boolean {
  try { return window.self !== window.top; } catch { return true; }
}

let _oauthCodeUsed = false;
let _oauthCodeExchanging = false;

async function exchangeOAuthCodeOnce(code: string) {
  if (_oauthCodeUsed || _oauthCodeExchanging) return;
  _oauthCodeExchanging = true;
  _oauthCodeUsed = true;
  await supabase.auth.exchangeCodeForSession(code);
  _oauthCodeExchanging = false;
}

// ── Auth service ──────────────────────────────────────────────────────
const authService = {
  mapUser(user: import('@supabase/supabase-js').User) {
    return {
      id: user.id,
      email: user.email!,
      username: user.user_metadata?.username || user.user_metadata?.full_name || user.user_metadata?.name || user.email!.split('@')[0],
      avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
    };
  },

  async sendOtp(email: string) {
    const { error } = await supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (error) throw error;
  },

  async verifyOtpAndSetPassword(email: string, token: string, password: string) {
    const { data, error } = await supabase.auth.verifyOtp({ email, token, type: 'email' });
    if (error) throw error;
    const username = email.split('@')[0];
    const { data: updated, error: updateError } = await supabase.auth.updateUser({ password, data: { username } });
    if (updateError) throw updateError;
    return updated.user;
  },

  async signIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return data.user;
  },

  async startGoogleOAuth(): Promise<{ ok: boolean; message?: string }> {
    const iframe = isInIframe();
    const w = 520, h = 720;
    const left = Math.max(0, window.screenX + (window.outerWidth - w) / 2);
    const top = Math.max(0, window.screenY + (window.outerHeight - h) / 2);
    const popup = iframe
      ? window.open('about:blank', 'onspace-oauth', `popup=yes,width=${w},height=${h},left=${Math.round(left)},top=${Math.round(top)}`)
      : null;

    if (iframe && !popup) {
      return { ok: false, message: 'Popup was blocked. Please allow popups and try again.' };
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        skipBrowserRedirect: true,
      },
    });

    if (error || !data.url) {
      popup?.close();
      return { ok: false, message: 'Unable to start Google login. Check Auth settings.' };
    }

    if (iframe && popup) popup.location.assign(data.url);
    else window.location.assign(data.url);
    return { ok: true };
  },
};

// ── Feature pills ─────────────────────────────────────────────────────
const FEATURES = [
  { icon: Brain, label: 'AI-Powered' },
  { icon: Shield, label: 'Bank-Grade Security' },
  { icon: Zap, label: 'Lightning Fast' },
  { icon: Globe, label: '7 AI Providers' },
];

type AuthStep = 'landing' | 'signin' | 'signup_email' | 'signup_otp' | 'signup_password' | 'forgot_email' | 'forgot_otp' | 'forgot_password';

export default function AuthPage() {
  const [step, setStep] = useState<AuthStep>('landing');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotOtp, setForgotOtp] = useState('');
  const [forgotPassword, setForgotPassword] = useState('');
  const popupRef = useRef<Window | null>(null);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  // Navigate away if already authed
  useEffect(() => {
    if (user) navigate('/', { replace: true });
  }, [user, navigate]);

  // Listen for OAuth popup message
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type !== 'OAUTH_CODE' || typeof event.data.code !== 'string') return;
      exchangeOAuthCodeOnce(event.data.code);
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────
  const handleSendOtp = useCallback(async () => {
    if (!email.trim() || !email.includes('@')) { toast.error('Please enter a valid email'); return; }
    setLoading(true);
    try {
      await authService.sendOtp(email.trim());
      toast.success('OTP sent — check your email');
      setStep('signup_otp');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally { setLoading(false); }
  }, [email]);

  const handleVerifyOtp = useCallback(async () => {
    if (otp.length < 4) { toast.error('Enter the 4-digit code'); return; }
    setStep('signup_password');
  }, [otp]);

  const handleRegister = useCallback(async () => {
    if (password.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    if (password !== confirmPw) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const user = await authService.verifyOtpAndSetPassword(email.trim(), otp, password);
      if (!user) throw new Error('Registration failed');
      login(authService.mapUser(user));
      toast.success('Account created! Welcome to Avni Image Studio');
      navigate('/');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Registration failed');
      setLoading(false);
    }
  }, [email, otp, password, confirmPw, login, navigate]);

  const handleSignIn = useCallback(async () => {
    if (!email.trim() || !password.trim()) { toast.error('Please fill in all fields'); return; }
    setLoading(true);
    try {
      const user = await authService.signIn(email.trim(), password);
      if (!user) throw new Error('Sign-in failed');
      login(authService.mapUser(user));
      toast.success('Welcome back!');
      navigate('/');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Sign-in failed');
      setLoading(false);
    }
  }, [email, password, login, navigate]);

  const handleForgotSendOtp = useCallback(async () => {
    if (!forgotEmail.trim() || !forgotEmail.includes('@')) { toast.error('Enter a valid email'); return; }
    setLoading(true);
    try {
      // Use signInWithOtp with shouldCreateUser: false for password reset
      const { error } = await supabase.auth.signInWithOtp({
        email: forgotEmail.trim(),
        options: { shouldCreateUser: false },
      });
      if (error) throw error;
      toast.success('Reset code sent — check your email');
      setStep('forgot_otp');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send reset code');
    } finally { setLoading(false); }
  }, [forgotEmail]);

  const handleForgotVerifyOtp = useCallback(async () => {
    if (forgotOtp.length < 4) { toast.error('Enter the verification code'); return; }
    setStep('forgot_password');
  }, [forgotOtp]);

  const handleForgotSetPassword = useCallback(async () => {
    if (forgotPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      // Verify OTP first — this signs in the user
      const { data, error } = await supabase.auth.verifyOtp({
        email: forgotEmail.trim(),
        token: forgotOtp,
        type: 'email',
      });
      if (error) throw error;
      // Now update the password
      const { error: updateError } = await supabase.auth.updateUser({ password: forgotPassword });
      if (updateError) throw updateError;
      if (data.user) {
        login(authService.mapUser(data.user));
        toast.success('Password reset! Welcome back.');
        navigate('/');
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Password reset failed');
      setLoading(false);
    }
  }, [forgotEmail, forgotOtp, forgotPassword, login, navigate]);

  const handleGoogleSignIn = useCallback(async () => {
    setLoading(true);
    const result = await authService.startGoogleOAuth();
    if (!result.ok) {
      toast.error(result.message ?? 'Google sign-in failed');
      setLoading(false);
    }
    // If ok + popup, loading stays true until auth state change fires
  }, []);

  // ── Google OAuth button (shared) ──────────────────────────────────
  const GoogleBtn = () => (
    <Button
      onClick={handleGoogleSignIn}
      disabled={loading}
      variant="outline"
      className="w-full border-border hover:border-primary/40 bg-secondary/30 hover:bg-secondary/60 flex items-center gap-3 py-3 h-auto"
    >
      <svg className="w-5 h-5" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      <span className="text-sm font-medium">Continue with Google</span>
    </Button>
  );

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background mesh-bg flex flex-col items-center justify-center px-4 py-12">
      {/* Background glows */}
      <div className="fixed top-0 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="fixed bottom-0 right-1/4 w-80 h-80 rounded-full bg-studio-rose/8 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 studio-gradient rounded-2xl flex items-center justify-center mb-3 glow-violet">
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <h1 className="font-display text-2xl font-black text-foreground">Avni Image Studio</h1>
          <p className="text-studio-gold text-sm italic mt-1">"Imagination is next reality"</p>
        </div>

        {/* Feature pills */}
        {step === 'landing' && (
          <div className="flex flex-wrap justify-center gap-2 mb-6">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 glass-card rounded-full text-xs text-muted-foreground">
                <Icon className="w-3 h-3 text-primary" />{label}
              </div>
            ))}
          </div>
        )}

        {/* Main card */}
        <div className="glass-card rounded-2xl p-6 border border-border/40 glow-violet">
          {/* ── LANDING ── */}
          {step === 'landing' && (
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-foreground text-center mb-4">Get Started</h2>
              <GoogleBtn />
              <div className="flex items-center gap-2 py-1">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-xs text-muted-foreground">or</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
              <Button onClick={() => setStep('signup_email')} className="w-full studio-gradient text-white border-0 py-3 h-auto">
                <Mail className="w-4 h-4 mr-2" />Create Account with Email
              </Button>
              <Button onClick={() => setStep('signin')} variant="outline" className="w-full border-border hover:border-primary/40 py-3 h-auto">
                <Lock className="w-4 h-4 mr-2" />Sign In
              </Button>
              <p className="text-[10px] text-muted-foreground/60 text-center pt-2">
                By continuing you agree to our Terms of Service.<br />
                Your data is encrypted and never sold.
              </p>
            </div>
          )}

          {/* ── FORGOT: Email ── */}
          {step === 'forgot_email' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-foreground">Reset Password</h2>
                <button onClick={() => setStep('signin')} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
              </div>
              <p className="text-xs text-muted-foreground">Enter your email to receive a reset code.</p>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                <input
                  type="email" value={forgotEmail} onChange={e => setForgotEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  onKeyDown={e => e.key === 'Enter' && handleForgotSendOtp()}
                />
              </div>
              <Button onClick={handleForgotSendOtp} disabled={loading} className="w-full studio-gradient text-white border-0 py-3 h-auto">
                {loading ? 'Sending…' : <><Mail className="w-4 h-4 mr-2" />Send Reset Code</>}
              </Button>
            </div>
          )}

          {/* ── FORGOT: OTP ── */}
          {step === 'forgot_otp' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-foreground">Verify Code</h2>
                <button onClick={() => setStep('forgot_email')} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
              </div>
              <p className="text-xs text-muted-foreground">Enter the code sent to <strong className="text-foreground">{forgotEmail}</strong></p>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Reset Code</label>
                <input
                  type="text" inputMode="numeric" maxLength={6} value={forgotOtp} onChange={e => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="0000"
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-sm text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                  onKeyDown={e => e.key === 'Enter' && handleForgotVerifyOtp()}
                />
              </div>
              <Button onClick={handleForgotVerifyOtp} disabled={forgotOtp.length < 4} className="w-full studio-gradient text-white border-0 py-3 h-auto">
                Verify Code <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <button onClick={handleForgotSendOtp} className="w-full text-xs text-muted-foreground hover:text-foreground text-center">Resend code</button>
            </div>
          )}

          {/* ── FORGOT: New Password ── */}
          {step === 'forgot_password' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-foreground">New Password</h2>
                <button onClick={() => setStep('forgot_otp')} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">New Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} value={forgotPassword} onChange={e => setForgotPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    onKeyDown={e => e.key === 'Enter' && handleForgotSetPassword()}
                  />
                  <button onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {forgotPassword.length > 0 && (
                <div className="flex gap-1">
                  {[1,2,3,4].map(n => (
                    <div key={n} className={`flex-1 h-1 rounded-full transition-colors ${
                      forgotPassword.length >= n * 3 ? (n <= 2 ? 'bg-amber-500' : n === 3 ? 'bg-blue-500' : 'bg-emerald-500') : 'bg-secondary'
                    }`} />
                  ))}
                </div>
              )}
              <Button onClick={handleForgotSetPassword} disabled={loading} className="w-full studio-gradient text-white border-0 py-3 h-auto">
                {loading ? 'Resetting…' : <><Shield className="w-4 h-4 mr-2" />Reset Password</>}
              </Button>
            </div>
          )}

          {/* ── SIGN IN ── */}
          {step === 'signin' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-foreground">Sign In</h2>
                <button onClick={() => setStep('landing')} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
              </div>
              <GoogleBtn />
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-xs text-muted-foreground">or email</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  onKeyDown={e => e.key === 'Enter' && handleSignIn()}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Password</label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                    onKeyDown={e => e.key === 'Enter' && handleSignIn()}
                  />
                  <button onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button onClick={handleSignIn} disabled={loading} className="w-full studio-gradient text-white border-0 py-3 h-auto">
                {loading ? 'Signing in…' : <>Sign In <ArrowRight className="w-4 h-4 ml-1.5" /></>}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                No account?{' '}
                <button onClick={() => setStep('signup_email')} className="text-primary hover:underline">Create one</button>
                {' '}·{' '}
                <button onClick={() => { setForgotEmail(email); setStep('forgot_email'); }} className="text-muted-foreground hover:text-foreground">Forgot password?</button>
              </p>
            </div>
          )}

          {/* ── SIGN UP: Email ── */}
          {step === 'signup_email' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-foreground">Create Account</h2>
                <button onClick={() => setStep('landing')} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
              </div>
              <GoogleBtn />
              <div className="flex items-center gap-2">
                <div className="flex-1 h-px bg-border/50" />
                <span className="text-xs text-muted-foreground">or email</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email Address</label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  onKeyDown={e => e.key === 'Enter' && handleSendOtp()}
                />
              </div>
              <Button onClick={handleSendOtp} disabled={loading} className="w-full studio-gradient text-white border-0 py-3 h-auto">
                {loading ? 'Sending OTP…' : <><Mail className="w-4 h-4 mr-2" />Send Verification Code</>}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Already have an account?{' '}
                <button onClick={() => setStep('signin')} className="text-primary hover:underline">Sign in</button>
              </p>
            </div>
          )}

          {/* ── SIGN UP: OTP ── */}
          {step === 'signup_otp' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-foreground">Verify Email</h2>
                <button onClick={() => setStep('signup_email')} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
              </div>
              <p className="text-xs text-muted-foreground">We sent a 4-digit code to <strong className="text-foreground">{email}</strong></p>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Verification Code</label>
                <input
                  type="text" inputMode="numeric" maxLength={6} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  placeholder="0000"
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-sm text-center tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-primary/50"
                  onKeyDown={e => e.key === 'Enter' && handleVerifyOtp()}
                />
              </div>
              <Button onClick={handleVerifyOtp} disabled={otp.length < 4} className="w-full studio-gradient text-white border-0 py-3 h-auto">
                Verify Code <ArrowRight className="w-4 h-4 ml-1.5" />
              </Button>
              <button onClick={handleSendOtp} className="w-full text-xs text-muted-foreground hover:text-foreground text-center">Resend code</button>
            </div>
          )}

          {/* ── SIGN UP: Password ── */}
          {step === 'signup_password' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-lg font-bold text-foreground">Set Password</h2>
                <button onClick={() => setStep('signup_otp')} className="text-xs text-muted-foreground hover:text-foreground">← Back</button>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1">
                  <User className="w-3 h-3" />Password
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 6 characters"
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <button onClick={() => setShowPw(p => !p)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Confirm Password</label>
                <input
                  type={showPw ? 'text' : 'password'} value={confirmPw} onChange={e => setConfirmPw(e.target.value)}
                  placeholder="Repeat password"
                  className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                  onKeyDown={e => e.key === 'Enter' && handleRegister()}
                />
              </div>
              {/* Password strength */}
              {password.length > 0 && (
                <div className="flex gap-1">
                  {[1,2,3,4].map(n => (
                    <div key={n} className={`flex-1 h-1 rounded-full transition-colors ${
                      password.length >= n * 3 ? (n <= 2 ? 'bg-amber-500' : n === 3 ? 'bg-blue-500' : 'bg-emerald-500') : 'bg-secondary'
                    }`} />
                  ))}
                </div>
              )}
              <Button onClick={handleRegister} disabled={loading} className="w-full studio-gradient text-white border-0 py-3 h-auto">
                {loading ? 'Creating Account…' : <><Shield className="w-4 h-4 mr-2" />Create Secure Account</>}
              </Button>
            </div>
          )}
        </div>

        {/* Security note */}
        <div className="flex items-center justify-center gap-2 mt-4 text-[10px] text-muted-foreground/50">
          <Shield className="w-3 h-3" />
          <span>256-bit encryption · GDPR compliant · No data sold</span>
        </div>
      </div>
    </div>
  );
}
