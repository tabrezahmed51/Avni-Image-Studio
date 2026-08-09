import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Eye, EyeOff, Sparkles, Mail, Lock, User, ArrowRight, Shield, Brain, Zap, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

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
      ? window.open('about:blank', 'avni-oauth', `popup=yes,width=${w},height=${h},left=${Math.round(left)},top=${Math.round(top)}`)
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

// ── Background Mosaic & Particle Canvas ───────────────────────────────
function BackgroundMosaic() {
  const IMAGES = [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400&q=80",
    "https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400&q=80",
    "https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&q=80",
    "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400&q=80",
    "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=400&q=80",
    "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=400&q=80",
    "https://images.unsplash.com/photo-1549490349-8643362247b5?w=400&q=80",
    "https://images.unsplash.com/photo-1618336753974-aae8e04506aa?w=400&q=80",
    "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400&q=80",
    "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=400&q=80",
    "https://images.unsplash.com/photo-1542831371-29b0f74f9713?w=400&q=80",
    "https://images.unsplash.com/photo-1563089145-599997674d42?w=400&q=80",
    "https://images.unsplash.com/photo-1579783928621-7a13d66a62d1?w=400&q=80",
    "https://images.unsplash.com/photo-1536924940846-227afb31e2a5?w=400&q=80",
    "https://images.unsplash.com/photo-1502134249126-9f3755a50d78?w=400&q=80",
    "https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=400&q=80",
    "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?w=400&q=80",
    "https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&q=80",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80",
    "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?w=400&q=80",
    "https://images.unsplash.com/photo-1554050857-c84a8abdb5e2?w=400&q=80",
    "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400&q=80",
    "https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?w=400&q=80",
    "https://images.unsplash.com/photo-1608889175123-8ec330b86f84?w=400&q=80",
    "https://images.unsplash.com/photo-1528459801416-a9e53bbf4e17?w=400&q=80",
    "https://images.unsplash.com/photo-1531346878377-a5be20888e57?w=400&q=80",
    "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?w=400&q=80",
    "https://images.unsplash.com/photo-1500485035595-cbeee2d65b2e?w=400&q=80",
    "https://images.unsplash.com/photo-1638913662252-70efd1a69363?w=400&q=80",
    "https://images.unsplash.com/photo-1561715276-a2d087060f1d?w=400&q=80",
  ];

  const gridItems = Array.from({ length: 40 }, (_, i) => {
    const image = IMAGES[i % IMAGES.length];
    const duration = 12 + (i % 5) * 3;
    const delay = (i % 7) * 2;
    return { id: i, image, duration, delay };
  });

  return (
    <div className="fixed inset-0 z-0 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-8 gap-3 p-3 opacity-[0.24] select-none pointer-events-none overflow-hidden bg-black">
      {gridItems.map((item) => (
        <motion.div
          key={item.id}
          className="w-full h-full aspect-square rounded-xl overflow-hidden bg-zinc-955 border border-white/5"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, delay: item.delay * 0.15 }}
        >
          <motion.img
            src={item.image}
            alt="Festival Backdrop"
            className="w-full h-full object-cover filter brightness-[0.7] saturate-[0.8] contrast-[1.1]"
            animate={{
              scale: [1, 1.12, 1],
              opacity: [0.75, 0.45, 0.75],
            }}
            transition={{
              duration: item.duration,
              repeat: Infinity,
              ease: "easeInOut",
              delay: item.delay,
            }}
          />
        </motion.div>
      ))}
    </div>
  );
}

function GlitterParticles() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    const colors = [
      'rgba(234, 179, 8, ',   // Gold
      'rgba(253, 224, 71, ',  // Light Gold
      'rgba(226, 232, 240, ', // Silver
      'rgba(168, 85, 247, ',  // Purple
      'rgba(236, 72, 153, ',  // Pink
      'rgba(56, 189, 248, ',  // Sky Blue
    ];

    interface Particle {
      x: number;
      y: number;
      size: number;
      speedY: number;
      speedX: number;
      opacity: number;
      opacitySpeed: number;
      colorPrefix: string;
      angle: number;
      spin: number;
    }

    const particleCount = 70;
    const particles: Particle[] = [];

    const createParticle = (randomY = false): Particle => ({
      x: Math.random() * width,
      y: randomY ? Math.random() * height : -10,
      size: Math.random() * 2 + 1,
      speedY: Math.random() * 0.6 + 0.2,
      speedX: Math.random() * 0.3 - 0.15,
      opacity: Math.random() * 0.4 + 0.2,
      opacitySpeed: Math.random() * 0.01 + 0.005,
      colorPrefix: colors[Math.floor(Math.random() * colors.length)],
      angle: Math.random() * Math.PI * 2,
      spin: Math.random() * 0.02 - 0.01,
    });

    for (let i = 0; i < particleCount; i++) {
      particles.push(createParticle(true));
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.y += p.speedY;
        p.x += p.speedX;
        p.angle += p.spin;

        const currentOpacity = p.opacity + Math.sin(p.angle) * 0.15;
        const clampedOpacity = Math.max(0.1, Math.min(currentOpacity, 0.7));

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        
        ctx.beginPath();
        ctx.moveTo(0, -p.size);
        ctx.lineTo(p.size / 1.5, 0);
        ctx.lineTo(0, p.size);
        ctx.lineTo(-p.size / 1.5, 0);
        ctx.closePath();

        ctx.fillStyle = `${p.colorPrefix}${clampedOpacity})`;
        ctx.fill();

        ctx.restore();

        if (p.y > height + 10 || p.x < -10 || p.x > width + 10) {
          particles[i] = createParticle(false);
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    }

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-0 pointer-events-none select-none" />;
}

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
    <div className="min-h-screen bg-[#07070a] flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden select-none">
      <style>{`
        .chromium-gold-text {
          font-family: 'Montserrat', 'Inter', sans-serif;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.12em;
          background: linear-gradient(
            to bottom,
            #ffffff 0%,
            #ffe27d 22%,
            #ca8a04 45%,
            #eab308 60%,
            #ca8a04 75%,
            #ffffff 88%,
            #854d0e 100%
          );
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          filter: drop-shadow(0 0 18px rgba(168, 85, 247, 0.7)) /* Neon Purple Glow */
                  drop-shadow(0 4px 20px rgba(234, 179, 8, 0.55)); /* Golden Glitter Drop Shadow */
        }
        .glassmorphic-auth-card {
          backdrop-filter: blur(25px);
          background: rgba(10, 10, 14, 0.72);
          border: 1px solid rgba(255, 255, 255, 0.08);
          box-shadow: 
            0 24px 70px rgba(0, 0, 0, 0.65),
            inset 0 0 0 1px rgba(255, 255, 255, 0.04),
            0 0 50px rgba(168, 85, 247, 0.12);
        }
      `}</style>

      {/* Photo Festival Background Grid & Particles */}
      <BackgroundMosaic />
      <GlitterParticles />

      {/* Central Layout Container */}
      <div className="w-full max-w-md relative z-10 flex flex-col items-center">
        {/* Main Branding Typography Header */}
        <div className="text-center mb-6 w-full select-none">
          <h2 className="chromium-gold-text text-3xl sm:text-4xl font-extrabold tracking-widest text-center">
            AVNI IMAGE STUDIO
          </h2>
        </div>

        {/* Official Logo Emblem - Interwoven Geometric Aperture & Stylized 'A' */}
        <div className="flex flex-col items-center mb-8 relative select-none">
          <div className="transition-transform duration-1000 hover:rotate-180 cursor-pointer">
            <svg className="w-16 h-16 drop-shadow-[0_0_15px_rgba(168,85,247,0.3)]" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <linearGradient id="aperture-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#a855f7" />
                  <stop offset="50%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#eab308" />
                </linearGradient>
                <linearGradient id="a-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ffffff" />
                  <stop offset="100%" stopColor="#eab308" />
                </linearGradient>
                <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3.5" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>
              <circle cx="50" cy="50" r="45" stroke="url(#aperture-grad)" strokeWidth="1.5" strokeDasharray="6 3" />
              <path d="M50 5 L75 35 M75 35 L95 50 M95 50 L65 75 M65 75 L50 95 M50 95 L25 65 M25 65 L5 50 M5 50 L35 25 M35 25 L50 5" stroke="url(#aperture-grad)" strokeWidth="1" strokeOpacity="0.4" />
              <circle cx="50" cy="50" r="32" stroke="url(#aperture-grad)" strokeWidth="2" strokeOpacity="0.25" />
              <path d="M50 24 L28 72 H38 L50 44 L62 72 H72 L50 24 Z" fill="url(#a-grad)" filter="url(#logo-glow)" />
              <path d="M41 58 H59" stroke="url(#a-grad)" strokeWidth="4.5" strokeLinecap="round" />
              <circle cx="50" cy="50" r="6" fill="#eab308" opacity="0.3" />
              <circle cx="50" cy="50" r="2" fill="#ffffff" />
            </svg>
          </div>
          <span className="text-[9px] text-studio-gold/75 tracking-widest uppercase mt-2 font-medium">
            "Imagination is next reality"
          </span>
        </div>

        {/* Feature pills */}
        {step === 'landing' && (
          <div className="flex flex-wrap justify-center gap-2 mb-6 w-full select-none">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 backdrop-blur-md bg-white/5 border border-white/5 rounded-full text-[10px] text-zinc-300 font-medium">
                <Icon className="w-3 h-3 text-primary animate-pulse" />{label}
              </div>
            ))}
          </div>
        )}

        {/* Main card */}
        <div className="glassmorphic-auth-card rounded-3xl p-8 border border-white/10 glow-violet shadow-2xl relative overflow-hidden w-full">
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
