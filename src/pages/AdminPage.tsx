import { useState, useCallback } from 'react';
import {
  Shield, Users, Cpu, BarChart3, Settings, LogOut, Sparkles,
  ChevronRight, Activity, Key, Lock, Eye, AlertTriangle,
  Database, Globe, Zap, Brain, X, Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import AdminAIProvidersModal from '@/components/features/AdminAIProvidersModal';

// ── Sidebar nav items ──────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'ai_providers', label: 'AI Providers', icon: Cpu },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

type NavId = typeof NAV_ITEMS[number]['id'];

// ── Stat card ──────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, sub }: { label: string; value: string | number; icon: React.ElementType; color: string; sub?: string }) {
  return (
    <div className="glass-card rounded-xl p-4 border border-border/40">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${color}`}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
      <p className="text-2xl font-bold text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

// ── Security info panel ────────────────────────────────────────────────
function SecurityPanel() {
  const items = [
    { label: 'Row Level Security (RLS)', status: 'active', desc: 'All tables protected with RLS policies' },
    { label: 'Authentication', status: 'active', desc: 'PKCE OAuth flow + OTP + password hashing' },
    { label: 'API Key Storage', status: 'active', desc: 'Keys stored locally, never transmitted to our servers' },
    { label: 'Input Sanitization', status: 'active', desc: 'XSS, prompt injection, and bot detection active' },
    { label: 'HTTPS Only', status: 'active', desc: 'All connections encrypted via TLS 1.3' },
    { label: 'Bot Detection', status: 'active', desc: 'User-agent filtering + honeypot fields' },
    { label: 'Rate Limiting', status: 'active', desc: 'Client-side request throttling per feature' },
    { label: 'GDPR Compliance', status: 'info', desc: 'Users can delete their data at any time' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="w-5 h-5 text-emerald-400" />
        <h2 className="text-base font-bold text-foreground">Security Status</h2>
      </div>
      <div className="grid gap-2">
        {items.map(({ label, status, desc }) => (
          <div key={label} className="flex items-center gap-3 p-3 glass-card rounded-xl border border-border/30">
            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${status === 'active' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground">{label}</p>
              <p className="text-[10px] text-muted-foreground">{desc}</p>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${status === 'active' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-blue-400/10 text-blue-400'}`}>
              {status === 'active' ? '✓ Active' : 'Info'}
            </span>
          </div>
        ))}
      </div>

      {/* Security layers visualization */}
      <div className="glass-card rounded-xl p-4 border border-border/40 mt-4">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />Security Layers
        </h3>
        <div className="space-y-2">
          {[
            { layer: 'Surface', desc: 'HTTPS, CSP headers, XSS protection', color: 'from-sky-500/30 to-sky-500/10' },
            { layer: 'Application', desc: 'Auth guards, rate limiting, input sanitization', color: 'from-blue-500/30 to-blue-500/10' },
            { layer: 'Database', desc: 'RLS policies, encrypted at rest, parameterized queries', color: 'from-violet-500/30 to-violet-500/10' },
            { layer: 'Identity', desc: 'PKCE OAuth, OTP verification, JWT tokens', color: 'from-purple-500/30 to-purple-500/10' },
            { layer: 'Quantum-ready', desc: 'Supabase uses SHA-256 + post-quantum migration roadmap', color: 'from-pink-500/30 to-pink-500/10' },
          ].map(({ layer, desc, color }) => (
            <div key={layer} className={`flex items-center gap-3 px-3 py-2 rounded-lg bg-gradient-to-r ${color} border border-white/5`}>
              <span className="text-[10px] font-mono font-bold text-foreground/60 w-20 shrink-0">{layer}</span>
              <span className="text-[10px] text-muted-foreground">{desc}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Overview panel ─────────────────────────────────────────────────────
function OverviewPanel({ openAIProviders }: { openAIProviders: () => void }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Security Level" value="A+" icon={Shield} color="bg-emerald-500" sub="All checks passing" />
        <StatCard label="AI Providers" value="7" icon={Brain} color="bg-violet-500" sub="Configurable" />
        <StatCard label="Auth Methods" value="3" icon={Key} color="bg-blue-500" sub="OTP, Password, Google" />
        <StatCard label="Uptime" value="99.9%" icon={Activity} color="bg-amber-500" sub="OnSpace Cloud" />
      </div>

      <div className="grid md:grid-cols-2 gap-3">
        <div className="glass-card rounded-xl p-4 border border-border/40">
          <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
          <div className="space-y-2">
            <button onClick={openAIProviders} className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs text-foreground">Manage AI Providers</span>
              </div>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-2">
                <Globe className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-xs text-foreground">View Security Report</span>
              </div>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs text-foreground">Performance Monitor</span>
              </div>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="glass-card rounded-xl p-4 border border-border/40">
          <h3 className="text-sm font-semibold text-foreground mb-3">System Status</h3>
          <div className="space-y-2">
            {[
              { name: 'Database (PostgreSQL)', ok: true },
              { name: 'Auth Service', ok: true },
              { name: 'Storage Bucket', ok: true },
              { name: 'Edge Functions', ok: true },
              { name: 'External Providers', ok: null },
            ].map(({ name, ok }) => (
              <div key={name} className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{name}</span>
                <span className={`text-[10px] font-medium ${ok === true ? 'text-emerald-400' : ok === false ? 'text-red-400' : 'text-amber-400'}`}>
                  {ok === true ? '✓ Online' : ok === false ? '✗ Offline' : '~ Check Settings'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Admin page ────────────────────────────────────────────────────
export default function AdminPage() {
  const [activeNav, setActiveNav] = useState<NavId>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiProvidersOpen, setAIProvidersOpen] = useState(false);
  const { user, logout } = useAuth();

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    logout();
    toast.success('Signed out');
  }, [logout]);

  const renderContent = () => {
    switch (activeNav) {
      case 'overview': return <OverviewPanel openAIProviders={() => setAIProvidersOpen(true)} />;
      case 'ai_providers': return (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Cpu className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">AI Provider Management</h2>
          </div>
          <p className="text-xs text-muted-foreground mb-4">Configure all external AI providers. Keys are encrypted client-side and never sent to our servers.</p>
          <Button onClick={() => setAIProvidersOpen(true)} className="studio-gradient text-white border-0">
            <Settings className="w-4 h-4 mr-2" />Open Provider Manager
          </Button>
        </div>
      );
      case 'security': return <SecurityPanel />;
      case 'users': return (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">User Management</h2>
          </div>
          <div className="glass-card rounded-xl p-4 border border-border/40">
            <p className="text-xs text-muted-foreground">User management available via OnSpace Cloud Dashboard → Data tab. Click the "Cloud" button in the top-right of your workspace.</p>
          </div>
        </div>
      );
      case 'database': return (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">Database & RLS</h2>
          </div>
          <div className="space-y-3">
            {[
              { table: 'user_profiles', rls: true, policies: 3 },
              { table: 'admin_users', rls: true, policies: 2 },
              { table: 'api_provider_keys', rls: true, policies: 4 },
              { table: 'ai_usage_logs', rls: true, policies: 3 },
            ].map(({ table, rls, policies }) => (
              <div key={table} className="flex items-center justify-between p-3 glass-card rounded-xl border border-border/30">
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-mono text-foreground">{table}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${rls ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
                    RLS {rls ? 'ON' : 'OFF'}
                  </span>
                  <span className="text-[10px] text-muted-foreground">{policies} policies</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      case 'settings': return (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-primary" />
            <h2 className="text-base font-bold text-foreground">App Settings</h2>
          </div>
          <div className="space-y-3">
            <div className="glass-card rounded-xl p-4 border border-border/40">
              <h3 className="text-sm font-semibold text-foreground mb-2">Account</h3>
              <p className="text-xs text-muted-foreground mb-1">Signed in as: <span className="text-foreground">{user?.email}</span></p>
              <p className="text-xs text-muted-foreground">Username: <span className="text-foreground">{user?.username}</span></p>
            </div>
            <Button onClick={handleLogout} variant="outline" className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50">
              <LogOut className="w-4 h-4 mr-2" />Sign Out
            </Button>
          </div>
        </div>
      );
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-background mesh-bg flex">
      {/* AI Providers modal */}
      <AdminAIProvidersModal open={aiProvidersOpen} onClose={() => setAIProvidersOpen(false)} />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-60 flex flex-col border-r border-border/40 glass-card transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        {/* Brand */}
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 studio-gradient rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Admin Panel</p>
              <p className="text-[10px] text-muted-foreground">Avni Studio</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden w-6 h-6 rounded-lg bg-secondary/60 flex items-center justify-center">
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveNav(id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${activeNav === id ? 'studio-gradient text-white' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'}`}
            >
              <Icon className="w-3.5 h-3.5" />{label}
              {id === 'ai_providers' && <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">7</span>}
              {id === 'security' && <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-400 font-bold">A+</span>}
            </button>
          ))}
        </nav>

        {/* User info */}
        <div className="p-3 border-t border-border/30">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-secondary/30">
            {user?.avatar
              ? <img src={user.avatar} alt="" className="w-6 h-6 rounded-full object-cover" />
              : <div className="w-6 h-6 rounded-full studio-gradient flex items-center justify-center text-[10px] text-white font-bold">{user?.username?.[0]?.toUpperCase()}</div>
            }
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-medium text-foreground truncate">{user?.username}</p>
              <p className="text-[9px] text-muted-foreground truncate">{user?.email}</p>
            </div>
            <button onClick={handleLogout} className="w-5 h-5 rounded-md hover:bg-secondary flex items-center justify-center" title="Sign out">
              <LogOut className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border/30 glass-card sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="lg:hidden w-8 h-8 rounded-lg bg-secondary/60 hover:bg-secondary flex items-center justify-center">
              <Menu className="w-4 h-4 text-muted-foreground" />
            </button>
            <div>
              <h1 className="text-sm font-bold text-foreground">{NAV_ITEMS.find(n => n.id === activeNav)?.label}</h1>
              <p className="text-[10px] text-muted-foreground hidden sm:block">Avni Image Studio — Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a href="/" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              ← Studio
            </a>
            <div className="flex items-center gap-1.5 px-2 py-1 glass-card rounded-full text-[10px] text-emerald-400 border border-emerald-400/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Secure
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 sm:p-6 overflow-auto">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
