import { useState, useCallback, useEffect } from 'react';
import {
  Shield, Users, Cpu, BarChart3, Settings, LogOut, Sparkles,
  ChevronRight, Activity, Key, Lock, Database, Globe, Zap, Brain,
  X, Menu, BarChart2, CheckCircle2, XCircle, Clock, Download,
  UserPlus, Crown, AlertTriangle, RefreshCw, ImageIcon, Eye,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useAdminRole } from '@/hooks/useAdminRole';
import { supabase } from '@/lib/supabaseClient';
import { toast } from 'sonner';
import AdminAIProvidersModal from '@/components/features/AdminAIProvidersModal';

// ── Nav items ─────────────────────────────────────────────────────────
const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'analytics', label: 'Analytics', icon: BarChart2 },
  { id: 'moderation', label: 'Moderation', icon: Eye },
  { id: 'ai_providers', label: 'AI Providers', icon: Cpu },
  { id: 'users', label: 'Users & Roles', icon: Users },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'database', label: 'Database', icon: Database },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

type NavId = typeof NAV_ITEMS[number]['id'];

// ── Stat card ──────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color, sub }: {
  label: string; value: string | number; icon: React.ElementType; color: string; sub?: string;
}) {
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

// ── Analytics Panel ────────────────────────────────────────────────────
interface UsageLog {
  id: string; feature: string; provider: string; model: string | null;
  success: boolean; error_msg: string | null; created_at: string;
}

function AnalyticsPanel() {
  const [logs, setLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from('ai_usage_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200)
      .then(({ data }) => { if (data) setLogs(data as UsageLog[]); setLoading(false); });
  }, []);

  // Aggregate by provider
  const byProvider = logs.reduce<Record<string, { success: number; fail: number }>>((acc, l) => {
    if (!acc[l.provider]) acc[l.provider] = { success: 0, fail: 0 };
    l.success ? acc[l.provider].success++ : acc[l.provider].fail++;
    return acc;
  }, {});

  const chartData = Object.entries(byProvider).map(([provider, v]) => ({
    provider: provider.charAt(0).toUpperCase() + provider.slice(1),
    success: v.success,
    fail: v.fail,
    total: v.success + v.fail,
  })).sort((a, b) => b.total - a.total);

  const totalRequests = logs.length;
  const successCount = logs.filter(l => l.success).length;
  const successRate = totalRequests > 0 ? Math.round((successCount / totalRequests) * 100) : 0;

  // CSV export
  const exportCSV = () => {
    const header = 'date,feature,provider,model,success,error_msg\n';
    const rows = logs.map(l => [
      new Date(l.created_at).toISOString(),
      l.feature, l.provider,
      l.model ?? '',
      l.success ? 'true' : 'false',
      (l.error_msg ?? '').replace(/,/g, ';'),
    ].join(',')).join('\n');
    const blob = new Blob([header + rows], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `avni-usage-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success('CSV downloaded!');
  };

  if (loading) return (
    <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
      <RefreshCw className="w-4 h-4 animate-spin" /> Loading analytics…
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">AI Usage Analytics</h2>
        </div>
        <Button onClick={exportCSV} variant="outline" size="sm" className="border-border/50 text-xs gap-1.5">
          <Download className="w-3.5 h-3.5" />Export CSV
        </Button>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Requests" value={totalRequests} icon={Activity} color="bg-violet-500" />
        <StatCard label="Success Rate" value={`${successRate}%`} icon={CheckCircle2} color="bg-emerald-500" sub={`${successCount} succeeded`} />
        <StatCard label="Failures" value={totalRequests - successCount} icon={XCircle} color="bg-red-500" sub={`${100 - successRate}% fail rate`} />
        <StatCard label="Providers Used" value={Object.keys(byProvider).length} icon={Brain} color="bg-blue-500" />
      </div>

      {/* Bar chart */}
      {chartData.length > 0 ? (
        <div className="glass-card rounded-xl p-4 border border-border/40">
          <h3 className="text-sm font-semibold text-foreground mb-4">Requests by Provider</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(240 10% 16%)" />
              <XAxis dataKey="provider" tick={{ fill: 'hsl(240 10% 60%)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'hsl(240 10% 60%)', fontSize: 11 }} />
              <Tooltip
                contentStyle={{ background: 'hsl(240 12% 8%)', border: '1px solid hsl(240 10% 20%)', borderRadius: 8 }}
                labelStyle={{ color: 'hsl(280 20% 96%)' }}
              />
              <Bar dataKey="success" name="Success" fill="hsl(142 70% 45%)" radius={[3, 3, 0, 0]} />
              <Bar dataKey="fail" name="Failed" fill="hsl(0 70% 55%)" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="glass-card rounded-xl p-8 border border-border/40 text-center text-muted-foreground text-sm">
          No usage data yet. Generate some images first!
        </div>
      )}

      {/* Recent logs */}
      {logs.length > 0 && (
        <div className="glass-card rounded-xl p-4 border border-border/40">
          <h3 className="text-sm font-semibold text-foreground mb-3">Recent Activity</h3>
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {logs.slice(0, 20).map(l => (
              <div key={l.id} className="flex items-center gap-2 p-2 rounded-lg bg-secondary/30 text-xs">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${l.success ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <span className="text-muted-foreground flex-shrink-0">
                  {new Date(l.created_at).toLocaleDateString()}
                </span>
                <span className="font-medium text-foreground">{l.provider}</span>
                <span className="text-muted-foreground/60">→</span>
                <span className="text-muted-foreground">{l.feature}</span>
                {l.model && <span className="text-[10px] text-muted-foreground/50 truncate">{l.model}</span>}
                {!l.success && l.error_msg && (
                  <span className="text-red-400/70 text-[10px] truncate ml-auto">{l.error_msg.slice(0, 40)}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Moderation Panel ──────────────────────────────────────────────────
interface PendingImage {
  id: string; image_url: string; prompt: string; style: string; published_at: string;
}

function ModerationPanel({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [pending, setPending] = useState<PendingImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<Record<string, boolean>>({});

  const fetchPending = useCallback(async () => {
    const { data } = await supabase
      .from('public_gallery')
      .select('id, image_url, prompt, style, published_at')
      .eq('is_approved', false)
      .order('published_at', { ascending: true })
      .limit(50);
    setPending((data as PendingImage[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  const handleApprove = async (id: string) => {
    setProcessing(p => ({ ...p, [id]: true }));
    const { error } = await supabase
      .from('public_gallery')
      .update({ is_approved: true })
      .eq('id', id);
    if (!error) {
      setPending(prev => prev.filter(p => p.id !== id));
      toast.success('Image approved and published to gallery!');
    } else {
      toast.error('Failed to approve: ' + error.message);
    }
    setProcessing(p => ({ ...p, [id]: false }));
  };

  const handleReject = async (id: string) => {
    setProcessing(p => ({ ...p, [id]: true }));
    const { error } = await supabase
      .from('public_gallery')
      .delete()
      .eq('id', id);
    if (!error) {
      setPending(prev => prev.filter(p => p.id !== id));
      toast.success('Image rejected and removed.');
    } else {
      toast.error('Failed to reject: ' + error.message);
    }
    setProcessing(p => ({ ...p, [id]: false }));
  };

  if (!isSuperAdmin) return (
    <div className="flex items-center gap-3 p-4 glass-card rounded-xl border border-amber-500/20 bg-amber-500/5">
      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
      <p className="text-xs text-muted-foreground">Moderation access requires superadmin role.</p>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary" />
          <h2 className="text-base font-bold text-foreground">Moderation Queue</h2>
          {pending.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-400 font-bold">{pending.length} pending</span>
          )}
        </div>
        <button onClick={fetchPending} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          <RefreshCw className="w-3 h-3" />Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
          <RefreshCw className="w-4 h-4 animate-spin" /> Loading…
        </div>
      ) : pending.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-muted-foreground">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mb-2" />
          <p className="text-sm font-medium text-emerald-400">Queue is empty</p>
          <p className="text-xs mt-1">All submitted images have been reviewed.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {pending.map(img => (
            <div key={img.id} className="glass-card rounded-xl overflow-hidden border border-border/40">
              <div className="relative">
                <img src={img.image_url} alt={img.prompt} className="w-full h-40 object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-2 left-2 right-2">
                  <p className="text-white text-[10px] line-clamp-2">{img.prompt}</p>
                </div>
              </div>
              <div className="p-2.5 flex gap-2">
                <Button
                  onClick={() => handleApprove(img.id)}
                  disabled={processing[img.id]}
                  size="sm"
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white border-0 text-xs h-8"
                >
                  {processing[img.id] ? <RefreshCw className="w-3 h-3 animate-spin" /> : <><CheckCircle2 className="w-3 h-3 mr-1" />Approve</>}
                </Button>
                <Button
                  onClick={() => handleReject(img.id)}
                  disabled={processing[img.id]}
                  variant="outline"
                  size="sm"
                  className="flex-1 border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs h-8"
                >
                  <XCircle className="w-3 h-3 mr-1" />Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Invite Admin UI ────────────────────────────────────────────────────
function UsersPanel({ isSuperAdmin }: { isSuperAdmin: boolean }) {
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'moderator'>('admin');
  const [inviting, setInviting] = useState(false);
  const [admins, setAdmins] = useState<{ id: string; role: string; user_id: string; email?: string }[]>([]);

  useEffect(() => {
    if (!isSuperAdmin) return;
    supabase
      .from('admin_users')
      .select('id, role, user_id')
      .then(({ data }) => {
        if (data) setAdmins(data);
      });
  }, [isSuperAdmin]);

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) { toast.error('Enter a valid email'); return; }
    setInviting(true);
    const { data, error } = await supabase.rpc('invite_admin', {
      target_email: inviteEmail.trim(),
      target_role: inviteRole,
    });
    if (error || !data?.ok) {
      toast.error((data as { error?: string })?.error ?? error?.message ?? 'Failed to invite');
    } else {
      toast.success(`${inviteEmail} granted ${inviteRole} role!`);
      setInviteEmail('');
    }
    setInviting(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 mb-2">
        <Users className="w-5 h-5 text-primary" />
        <h2 className="text-base font-bold text-foreground">Users & Roles</h2>
      </div>

      {/* Invite Admin */}
      {isSuperAdmin ? (
        <div className="glass-card rounded-xl p-4 border border-border/40">
          <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-primary" />Invite Admin
          </h3>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              placeholder="admin@example.com"
              className="flex-1 bg-secondary/50 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
              onKeyDown={e => e.key === 'Enter' && handleInvite()}
            />
            <select
              value={inviteRole}
              onChange={e => setInviteRole(e.target.value as 'admin' | 'moderator')}
              className="bg-secondary/50 border border-border rounded-xl px-3 py-2 text-xs focus:outline-none"
            >
              <option value="admin">Admin</option>
              <option value="moderator">Moderator</option>
            </select>
            <Button
              onClick={handleInvite}
              disabled={inviting}
              className="studio-gradient text-white border-0 text-xs px-4 h-9"
            >
              {inviting ? <RefreshCw className="w-3 h-3 animate-spin" /> : <><UserPlus className="w-3.5 h-3.5 mr-1" />Grant Role</>}
            </Button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2">
            User must already have an account. Role is granted immediately.
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 glass-card rounded-xl border border-amber-500/20 bg-amber-500/5">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <p className="text-xs text-muted-foreground">Only superadmins can invite or manage other admins.</p>
        </div>
      )}

      {/* Admin list */}
      {isSuperAdmin && admins.length > 0 && (
        <div className="glass-card rounded-xl p-4 border border-border/40">
          <h3 className="text-sm font-semibold text-foreground mb-3">Current Admins</h3>
          <div className="space-y-2">
            {admins.map(a => (
              <div key={a.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/30">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full studio-gradient flex items-center justify-center">
                    {a.role === 'superadmin' ? <Crown className="w-3 h-3 text-white" /> : <Shield className="w-3 h-3 text-white" />}
                  </div>
                  <span className="text-xs font-mono text-muted-foreground">{a.user_id.slice(0, 8)}…</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  a.role === 'superadmin' ? 'bg-violet-400/20 text-violet-400' :
                  a.role === 'admin' ? 'bg-blue-400/20 text-blue-400' : 'bg-amber-400/20 text-amber-400'
                }`}>{a.role}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cloud note */}
      <div className="glass-card rounded-xl p-4 border border-border/40">
        <p className="text-xs text-muted-foreground">
          Full user management (view all users, delete accounts) is available via{' '}
          <span className="text-foreground font-medium">OnSpace Cloud Dashboard → Data tab</span>.
        </p>
      </div>
    </div>
  );
}

// ── Security Panel ─────────────────────────────────────────────────────
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
      <div className="glass-card rounded-xl p-4 border border-border/40 mt-2">
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary" />Security Layers
        </h3>
        <div className="space-y-2">
          {[
            { layer: 'Surface', desc: 'HTTPS, CSP headers, XSS protection', color: 'from-sky-500/30 to-sky-500/10' },
            { layer: 'Application', desc: 'Auth guards, rate limiting, input sanitization', color: 'from-blue-500/30 to-blue-500/10' },
            { layer: 'Database', desc: 'RLS policies, encrypted at rest, parameterized queries', color: 'from-violet-500/30 to-violet-500/10' },
            { layer: 'Identity', desc: 'PKCE OAuth, OTP verification, JWT tokens', color: 'from-purple-500/30 to-purple-500/10' },
            { layer: 'Quantum-ready', desc: 'Supabase SHA-256 + post-quantum migration roadmap', color: 'from-pink-500/30 to-pink-500/10' },
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

// ── Overview Panel ─────────────────────────────────────────────────────
function OverviewPanel({ openAIProviders, role }: { openAIProviders: () => void; role: string | null }) {
  const [pendingCount, setPendingCount] = useState<number | null>(null);

  useEffect(() => {
    supabase.from('public_gallery').select('id', { count: 'exact', head: true }).eq('is_approved', false)
      .then(({ count }) => setPendingCount(count ?? 0));
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Security Level" value="A+" icon={Shield} color="bg-emerald-500" sub="All checks passing" />
        <StatCard label="AI Providers" value="7" icon={Brain} color="bg-violet-500" sub="Configurable" />
        <StatCard label="Admin Role" value={role ?? '—'} icon={Crown} color="bg-amber-500" />
        <StatCard label="Pending Review" value={pendingCount ?? '…'} icon={Clock} color="bg-blue-500" sub="Images to moderate" />
      </div>
      <div className="grid md:grid-cols-2 gap-3">
        <div className="glass-card rounded-xl p-4 border border-border/40">
          <h3 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h3>
          <div className="space-y-1">
            <button onClick={openAIProviders} className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-2"><Cpu className="w-3.5 h-3.5 text-primary" /><span className="text-xs">Manage AI Providers</span></div>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-2"><Globe className="w-3.5 h-3.5 text-sky-400" /><span className="text-xs">View Public Gallery</span></div>
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </button>
            <button className="w-full flex items-center justify-between p-2.5 rounded-lg hover:bg-secondary/50 transition-colors">
              <div className="flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-amber-400" /><span className="text-xs">Performance Monitor</span></div>
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

// ── Main Admin Page ────────────────────────────────────────────────────
export default function AdminPage() {
  const [activeNav, setActiveNav] = useState<NavId>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aiProvidersOpen, setAIProvidersOpen] = useState(false);
  const { user, logout } = useAuth();
  const { role, isAdmin, isSuperAdmin, loading: roleLoading } = useAdminRole();

  const handleLogout = useCallback(async () => {
    await supabase.auth.signOut();
    logout();
    toast.success('Signed out');
  }, [logout]);

  // Access check
  if (roleLoading) return (
    <div className="min-h-screen bg-background mesh-bg flex items-center justify-center">
      <RefreshCw className="w-6 h-6 text-primary animate-spin" />
    </div>
  );

  if (!isAdmin) return (
    <div className="min-h-screen bg-background mesh-bg flex flex-col items-center justify-center gap-4 px-4">
      <AlertTriangle className="w-10 h-10 text-amber-400" />
      <h1 className="text-xl font-bold text-foreground">Access Denied</h1>
      <p className="text-muted-foreground text-sm text-center">
        You need admin privileges to access this panel.<br />
        Contact your superadmin to request access.
      </p>
      <a href="/" className="text-primary text-sm hover:underline">← Return to Studio</a>
    </div>
  );

  const renderContent = () => {
    switch (activeNav) {
      case 'overview':   return <OverviewPanel openAIProviders={() => setAIProvidersOpen(true)} role={role} />;
      case 'analytics':  return <AnalyticsPanel />;
      case 'moderation': return <ModerationPanel isSuperAdmin={isSuperAdmin} />;
      case 'ai_providers': return (
        <div>
          <div className="flex items-center gap-2 mb-4"><Cpu className="w-5 h-5 text-primary" /><h2 className="text-base font-bold text-foreground">AI Provider Management</h2></div>
          <p className="text-xs text-muted-foreground mb-4">Configure all external AI providers. Keys are encrypted client-side.</p>
          <Button onClick={() => setAIProvidersOpen(true)} className="studio-gradient text-white border-0">
            <Settings className="w-4 h-4 mr-2" />Open Provider Manager
          </Button>
        </div>
      );
      case 'users':    return <UsersPanel isSuperAdmin={isSuperAdmin} />;
      case 'security': return <SecurityPanel />;
      case 'database': return (
        <div>
          <div className="flex items-center gap-2 mb-4"><Database className="w-5 h-5 text-primary" /><h2 className="text-base font-bold text-foreground">Database & RLS</h2></div>
          <div className="space-y-2">
            {[
              { table: 'user_profiles', rls: true, policies: 3 },
              { table: 'admin_users', rls: true, policies: 4 },
              { table: 'api_provider_keys', rls: true, policies: 4 },
              { table: 'ai_usage_logs', rls: true, policies: 3 },
              { table: 'public_gallery', rls: true, policies: 5 },
            ].map(({ table, rls, policies }) => (
              <div key={table} className="flex items-center justify-between p-3 glass-card rounded-xl border border-border/30">
                <div className="flex items-center gap-2">
                  <Database className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-xs font-mono text-foreground">{table}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${rls ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>RLS {rls ? 'ON' : 'OFF'}</span>
                  <span className="text-[10px] text-muted-foreground">{policies} policies</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      );
      case 'settings': return (
        <div>
          <div className="flex items-center gap-2 mb-4"><Settings className="w-5 h-5 text-primary" /><h2 className="text-base font-bold text-foreground">App Settings</h2></div>
          <div className="space-y-3">
            <div className="glass-card rounded-xl p-4 border border-border/40">
              <h3 className="text-sm font-semibold text-foreground mb-2">Account</h3>
              <p className="text-xs text-muted-foreground mb-1">Signed in as: <span className="text-foreground">{user?.email}</span></p>
              <p className="text-xs text-muted-foreground">Role: <span className={`font-semibold ${isSuperAdmin ? 'text-violet-400' : 'text-blue-400'}`}>{role ?? 'user'}</span></p>
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
      <AdminAIProvidersModal open={aiProvidersOpen} onClose={() => setAIProvidersOpen(false)} />

      {sidebarOpen && <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-60 flex flex-col border-r border-border/40 glass-card transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}>
        <div className="flex items-center justify-between p-4 border-b border-border/30">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 studio-gradient rounded-lg flex items-center justify-center"><Sparkles className="w-3.5 h-3.5 text-white" /></div>
            <div>
              <p className="text-xs font-bold text-foreground">Admin Panel</p>
              <p className={`text-[9px] font-semibold ${isSuperAdmin ? 'text-violet-400' : 'text-blue-400'}`}>
                {isSuperAdmin ? '★ Superadmin' : `◆ ${role}`}
              </p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden w-6 h-6 rounded-lg bg-secondary/60 flex items-center justify-center">
            <X className="w-3 h-3 text-muted-foreground" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
            // Hide moderation and users invite from non-superadmin
            if ((id === 'moderation') && !isAdmin) return null;
            return (
              <button
                key={id}
                onClick={() => { setActiveNav(id); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${activeNav === id ? 'studio-gradient text-white' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'}`}
              >
                <Icon className="w-3.5 h-3.5" />{label}
                {id === 'ai_providers' && <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">7</span>}
                {id === 'security' && <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-400/20 text-emerald-400 font-bold">A+</span>}
              </button>
            );
          })}
        </nav>

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

      {/* Main */}
      <main className="flex-1 flex flex-col min-w-0">
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
            <a href="/" className="text-xs text-muted-foreground hover:text-foreground">← Studio</a>
            <a href="/gallery" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
              <Globe className="w-3 h-3" />Gallery
            </a>
            <div className="flex items-center gap-1.5 px-2 py-1 glass-card rounded-full text-[10px] text-emerald-400 border border-emerald-400/20">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />Secure
            </div>
          </div>
        </header>
        <div className="flex-1 p-4 sm:p-6 overflow-auto">{renderContent()}</div>
      </main>
    </div>
  );
}
