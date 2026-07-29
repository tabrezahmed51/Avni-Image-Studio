import { useState, useCallback } from 'react';
import {
  X, Settings2, Cpu, Key, Globe, ChevronDown, ChevronRight,
  TestTube2, CheckCircle2, XCircle, AlertTriangle, Loader2,
  Save, RefreshCw, ToggleLeft, ToggleRight, ExternalLink,
  Zap, Brain, Image, Wand2, Bot, Eye, EyeOff, Server, Cloud,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAIIntegrationStore } from '@/features/ai-integrations/store/aiIntegrationStore';
import { providerClientFactory } from '@/features/ai-integrations/services/providerClientFactory';
import { testOllamaConnection, listOllamaModels } from '@/lib/ollamaClient';
import { maskApiKey } from '@/lib/security';
import type { AIProvider } from '@/features/ai-integrations/types/aiIntegration.types';

// ── Provider metadata ─────────────────────────────────────────────────
interface ProviderMeta {
  icon: string;
  color: string;
  desc: string;
  docsUrl: string;
  keyFormat?: string;
  keyPlaceholder: string;
  isLocal?: boolean;
}

const PROVIDER_META: Record<string, ProviderMeta> = {
  openrouter: {
    icon: '🔀', color: 'text-purple-400', desc: 'Unified gateway to 200+ models — best for chat & generation fallback.',
    docsUrl: 'https://openrouter.ai/keys', keyFormat: 'sk-or-...', keyPlaceholder: 'sk-or-v1-...',
  },
  openai: {
    icon: '🤖', color: 'text-emerald-400', desc: 'GPT-4, DALL·E 3 — premium image generation and chat.',
    docsUrl: 'https://platform.openai.com/api-keys', keyFormat: 'sk-...', keyPlaceholder: 'sk-...',
  },
  gemini: {
    icon: '✨', color: 'text-blue-400', desc: 'Google Gemini — default chat provider with native image generation.',
    docsUrl: 'https://aistudio.google.com/apikey', keyFormat: 'AIza...', keyPlaceholder: 'AIzaSy...',
  },
  huggingface: {
    icon: '🤗', color: 'text-amber-400', desc: 'Hugging Face inference endpoints and Gradio Spaces.',
    docsUrl: 'https://huggingface.co/settings/tokens', keyFormat: 'hf_...', keyPlaceholder: 'hf_...',
  },
  grok: {
    icon: '⚡', color: 'text-sky-400', desc: "xAI Grok — X's powerful reasoning model with image support.",
    docsUrl: 'https://console.x.ai', keyFormat: 'xai-...', keyPlaceholder: 'xai-...',
  },
  qwen: {
    icon: '🌸', color: 'text-rose-400', desc: 'Alibaba Qwen — strong image editing fallback provider.',
    docsUrl: 'https://dashscope.aliyuncs.com', keyFormat: 'sk-...', keyPlaceholder: 'sk-...',
  },
  comfyui: {
    icon: '🎨', color: 'text-orange-400', desc: 'ComfyUI self-hosted — custom workflow execution for advanced AI pipelines.',
    docsUrl: 'https://github.com/comfyanonymous/ComfyUI', keyPlaceholder: 'http://localhost:8188',
  },
  ollama_local: {
    icon: '🦙', color: 'text-lime-400', desc: 'Ollama local — run AI models 100% on your machine (free, private).',
    docsUrl: 'https://ollama.com/download', keyPlaceholder: 'http://localhost:11434',
    isLocal: true,
  },
  ollama_cloud: {
    icon: '☁️', color: 'text-cyan-400', desc: 'Ollama Cloud — managed Ollama hosting with API key access.',
    docsUrl: 'https://ollama.com/cloud', keyPlaceholder: 'https://api.ollama.com',
  },
};

const PROVIDER_ORDER: AIProvider[] = ['openrouter', 'gemini', 'openai', 'grok', 'qwen', 'huggingface', 'comfyui'];

// ── Status badge ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { icon: React.ReactNode; label: string; cls: string }> = {
    connected: { icon: <CheckCircle2 className="w-3 h-3" />, label: 'Connected', cls: 'text-emerald-400 bg-emerald-400/10' },
    invalid_key: { icon: <XCircle className="w-3 h-3" />, label: 'Invalid Key', cls: 'text-red-400 bg-red-400/10' },
    rate_limited: { icon: <AlertTriangle className="w-3 h-3" />, label: 'Rate Limited', cls: 'text-amber-400 bg-amber-400/10' },
    not_configured: { icon: <AlertTriangle className="w-3 h-3" />, label: 'Not Configured', cls: 'text-muted-foreground bg-secondary' },
    offline: { icon: <XCircle className="w-3 h-3" />, label: 'Offline', cls: 'text-red-400 bg-red-400/10' },
    testing: { icon: <Loader2 className="w-3 h-3 animate-spin" />, label: 'Testing…', cls: 'text-blue-400 bg-blue-400/10' },
  };
  const s = map[status] ?? map.not_configured;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${s.cls}`}>
      {s.icon}{s.label}
    </span>
  );
}

// ── Toggle ─────────────────────────────────────────────────────────────
function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button onClick={() => onChange(!checked)} className="flex-shrink-0">
      {checked
        ? <ToggleRight className="w-7 h-7 text-primary" />
        : <ToggleLeft className="w-7 h-7 text-muted-foreground/40" />}
    </button>
  );
}

// ── Ollama panel ──────────────────────────────────────────────────────
function OllamaPanel() {
  const [localUrl, setLocalUrl] = useState('http://localhost:11434');
  const [cloudUrl, setCloudUrl] = useState('https://api.ollama.com');
  const [cloudKey, setCloudKey] = useState('');
  const [localModel, setLocalModel] = useState('llama3.2');
  const [cloudModel, setCloudModel] = useState('llama3.2');
  const [localModels, setLocalModels] = useState<string[]>([]);
  const [cloudModels, setCloudModels] = useState<string[]>([]);
  const [localStatus, setLocalStatus] = useState<string>('not_configured');
  const [cloudStatus, setCloudStatus] = useState<string>('not_configured');
  const [localError, setLocalError] = useState('');
  const [cloudError, setCloudError] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [testingLocal, setTestingLocal] = useState(false);
  const [testingCloud, setTestingCloud] = useState(false);

  const testLocal = async () => {
    setTestingLocal(true); setLocalStatus('testing'); setLocalError('');
    const result = await testOllamaConnection({ baseUrl: localUrl, model: localModel });
    setTestingLocal(false);
    if (result.ok) {
      setLocalStatus('connected');
      setLocalModels(result.models ?? []);
      toast.success(`Ollama local connected! ${result.models?.length ?? 0} models found.`);
    } else {
      setLocalStatus('offline');
      setLocalError(result.error ?? 'Connection failed');
      toast.error(`Ollama local: ${result.error}`);
    }
  };

  const testCloud = async () => {
    setTestingCloud(true); setCloudStatus('testing'); setCloudError('');
    const result = await testOllamaConnection({ baseUrl: cloudUrl, apiKey: cloudKey, model: cloudModel, isCloud: true });
    setTestingCloud(false);
    if (result.ok) {
      setCloudStatus('connected');
      setCloudModels(result.models ?? []);
      toast.success('Ollama Cloud connected!');
    } else {
      setCloudStatus('invalid_key');
      setCloudError(result.error ?? 'Connection failed');
      toast.error(`Ollama Cloud: ${result.error}`);
    }
  };

  const fetchLocalModels = async () => {
    const models = await listOllamaModels({ baseUrl: localUrl });
    setLocalModels(models);
  };

  return (
    <div className="space-y-4">
      {/* Local Ollama */}
      <div className="bg-secondary/30 rounded-xl p-4 border border-border/40">
        <div className="flex items-center gap-2 mb-3">
          <Server className="w-4 h-4 text-lime-400" />
          <span className="text-sm font-semibold text-foreground">Local Ollama</span>
          <StatusBadge status={localStatus} />
        </div>
        <p className="text-xs text-muted-foreground mb-3">Run AI models 100% on your machine. Requires Ollama installed with OLLAMA_ORIGINS=* set.</p>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Base URL</label>
            <input value={localUrl} onChange={e => setLocalUrl(e.target.value)}
              className="w-full bg-background/60 border border-border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
              placeholder="http://localhost:11434" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Default Model</label>
            <div className="flex gap-2">
              <input value={localModel} onChange={e => setLocalModel(e.target.value)}
                className="flex-1 bg-background/60 border border-border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
                placeholder="llama3.2" list="local-models-list" />
              <datalist id="local-models-list">
                {localModels.map(m => <option key={m} value={m} />)}
              </datalist>
              <button onClick={fetchLocalModels} className="px-2 py-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground text-xs">
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {localModels.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {localModels.map(m => (
                <button key={m} onClick={() => setLocalModel(m)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-mono border transition-all ${localModel === m ? 'bg-primary/20 border-primary/40 text-primary' : 'border-border/40 text-muted-foreground hover:border-primary/30'}`}>
                  {m}
                </button>
              ))}
            </div>
          )}
          {localError && <p className="text-xs text-red-400">{localError}</p>}
          <Button onClick={testLocal} disabled={testingLocal} size="sm" variant="outline" className="w-full border-lime-500/30 text-lime-400 hover:bg-lime-500/10 text-xs">
            {testingLocal ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Testing…</> : <><TestTube2 className="w-3 h-3 mr-1.5" />Test Local Connection</>}
          </Button>
        </div>
      </div>

      {/* Ollama Cloud */}
      <div className="bg-secondary/30 rounded-xl p-4 border border-border/40">
        <div className="flex items-center gap-2 mb-3">
          <Cloud className="w-4 h-4 text-cyan-400" />
          <span className="text-sm font-semibold text-foreground">Ollama Cloud</span>
          <StatusBadge status={cloudStatus} />
        </div>
        <p className="text-xs text-muted-foreground mb-3">Managed Ollama hosting. Get your API key from ollama.com/cloud.</p>
        <div className="space-y-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">API URL</label>
            <input value={cloudUrl} onChange={e => setCloudUrl(e.target.value)}
              className="w-full bg-background/60 border border-border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
              placeholder="https://api.ollama.com" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">API Key</label>
            <div className="relative">
              <input type={showKey ? 'text' : 'password'} value={cloudKey} onChange={e => setCloudKey(e.target.value)}
                className="w-full bg-background/60 border border-border rounded-lg px-3 py-2 pr-9 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
                placeholder="ollama_..." />
              <button onClick={() => setShowKey(p => !p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Default Model</label>
            <input value={cloudModel} onChange={e => setCloudModel(e.target.value)}
              className="w-full bg-background/60 border border-border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
              placeholder="llama3.2" list="cloud-models-list" />
            <datalist id="cloud-models-list">
              {cloudModels.map(m => <option key={m} value={m} />)}
            </datalist>
          </div>
          {cloudError && <p className="text-xs text-red-400">{cloudError}</p>}
          <Button onClick={testCloud} disabled={testingCloud} size="sm" variant="outline" className="w-full border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 text-xs">
            {testingCloud ? <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Testing…</> : <><TestTube2 className="w-3 h-3 mr-1.5" />Test Cloud Connection</>}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Provider card ─────────────────────────────────────────────────────
function ProviderCard({ provider }: { provider: AIProvider }) {
  const { state, dispatch } = useAIIntegrationStore();
  const config = state.providers[provider];
  const meta = PROVIDER_META[provider];
  const [expanded, setExpanded] = useState(false);
  const [localKey, setLocalKey] = useState(config?.auth?.apiKey ?? '');
  const [localUrl, setLocalUrl] = useState(config?.endpoints?.baseUrl ?? '');
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testError, setTestError] = useState('');

  if (!config || !meta) return null;

  const handleSaveKey = () => {
    dispatch({ type: 'SET_PROVIDER_AUTH', provider, auth: { apiKey: localKey } });
    if (localUrl) dispatch({ type: 'SET_PROVIDER_ENDPOINTS', provider, endpoints: { baseUrl: localUrl } });
    toast.success(`${config.label} settings saved`);
  };

  const handleTest = async () => {
    if (!localKey && provider !== 'comfyui') { toast.error('Enter an API key first'); return; }
    setTesting(true); setTestError('');
    dispatch({ type: 'SET_PROVIDER_STATUS', provider, status: 'testing' });
    try {
      const tempConfig = {
        ...config,
        auth: { ...config.auth, apiKey: localKey },
        endpoints: { ...config.endpoints, ...(localUrl ? { baseUrl: localUrl } : {}) },
      };
      const client = providerClientFactory(provider, tempConfig);
      const result = await client.testConnection();
      if (result.ok) {
        dispatch({ type: 'SET_PROVIDER_STATUS', provider, status: 'connected' });
        dispatch({ type: 'SET_PROVIDER_AUTH', provider, auth: { apiKey: localKey } });
        if (localUrl) dispatch({ type: 'SET_PROVIDER_ENDPOINTS', provider, endpoints: { baseUrl: localUrl } });
        toast.success(`${config.label} connected!`);
      } else {
        dispatch({ type: 'SET_PROVIDER_STATUS', provider, status: 'invalid_key', error: result.error });
        setTestError(result.error ?? 'Connection failed');
        toast.error(`${config.label}: ${result.error}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      dispatch({ type: 'SET_PROVIDER_STATUS', provider, status: 'offline', error: msg });
      setTestError(msg);
      toast.error(msg);
    } finally { setTesting(false); }
  };

  const isEnabled = config.settings.enabled;
  const status = config.settings.status;

  return (
    <div className={`rounded-xl border transition-all ${isEnabled ? 'border-border/60 bg-secondary/20' : 'border-border/20 bg-secondary/10 opacity-60'}`}>
      {/* Header row */}
      <div className="flex items-center gap-3 p-3">
        <span className="text-xl w-7 text-center">{meta.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold ${meta.color}`}>{config.label}</span>
            <StatusBadge status={status} />
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-1">{meta.desc}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Toggle checked={isEnabled} onChange={v => dispatch({ type: 'SET_PROVIDER_ENABLED', provider, enabled: v })} />
          <button onClick={() => setExpanded(e => !e)} className="w-7 h-7 rounded-lg bg-secondary/60 hover:bg-secondary flex items-center justify-center">
            {expanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {/* Expanded config */}
      {expanded && (
        <div className="px-3 pb-3 border-t border-border/30 pt-3 space-y-3">
          {/* API Key field */}
          {provider !== 'comfyui' && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-muted-foreground flex items-center gap-1"><Key className="w-3 h-3" />API Key</label>
                <a href={meta.docsUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary hover:underline flex items-center gap-0.5">
                  Get key <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
              <div className="relative">
                <input
                  type={showKey ? 'text' : 'password'}
                  value={localKey}
                  onChange={e => setLocalKey(e.target.value)}
                  placeholder={meta.keyPlaceholder}
                  className="w-full bg-background/60 border border-border rounded-lg px-3 py-2 pr-9 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                <button onClick={() => setShowKey(p => !p)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  {showKey ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
              {config.auth.apiKey && !showKey && (
                <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">Saved: {maskApiKey(config.auth.apiKey)}</p>
              )}
              {meta.keyFormat && <p className="text-[10px] text-muted-foreground/50 mt-1">Format: {meta.keyFormat}</p>}
            </div>
          )}

          {/* Custom URL (ComfyUI + HuggingFace) */}
          {(provider === 'comfyui' || provider === 'huggingface') && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block flex items-center gap-1"><Globe className="w-3 h-3" />Endpoint URL</label>
              <input value={localUrl} onChange={e => setLocalUrl(e.target.value)}
                placeholder={meta.keyPlaceholder}
                className="w-full bg-background/60 border border-border rounded-lg px-3 py-2 text-xs font-mono focus:outline-none focus:ring-1 focus:ring-primary/50" />
            </div>
          )}

          {/* Capabilities */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Capabilities</p>
            <div className="flex flex-wrap gap-1.5">
              {(Object.entries(config.capabilities) as [string, boolean][])
                .filter(([k]) => !['customEndpoint', 'selfHosted', 'gradioSpace'].includes(k))
                .map(([cap, supported]) => (
                  <span key={cap} className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium ${supported ? 'bg-primary/15 text-primary/90' : 'bg-secondary text-muted-foreground/40 line-through'}`}>
                    {cap === 'chat' && <Bot className="w-2.5 h-2.5" />}
                    {cap.includes('image') && <Image className="w-2.5 h-2.5" />}
                    {cap.includes('text_to') && <Wand2 className="w-2.5 h-2.5" />}
                    {cap.includes('inspire') && <Zap className="w-2.5 h-2.5" />}
                    {cap.replace(/_/g, ' ')}
                  </span>
                ))}
            </div>
          </div>

          {testError && <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{testError}</p>}

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={handleTest} disabled={testing} size="sm" variant="outline" className="flex-1 border-border text-xs hover:border-primary/40">
              {testing ? <><Loader2 className="w-3 h-3 mr-1 animate-spin" />Testing…</> : <><TestTube2 className="w-3 h-3 mr-1" />Test</>}
            </Button>
            <Button onClick={handleSaveKey} size="sm" className="flex-1 studio-gradient text-white border-0 text-xs">
              <Save className="w-3 h-3 mr-1" />Save
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tabs ───────────────────────────────────────────────────────────────
const TABS = ['Providers', 'Ollama', 'Defaults', 'Advanced'] as const;
type Tab = typeof TABS[number];

// ── Main modal ─────────────────────────────────────────────────────────
interface AdminAIProvidersModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AdminAIProvidersModal({ open, onClose }: AdminAIProvidersModalProps) {
  const [tab, setTab] = useState<Tab>('Providers');
  const { state, dispatch } = useAIIntegrationStore();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col glass-card rounded-2xl border border-border/40 shadow-2xl glow-violet overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 studio-gradient rounded-lg flex items-center justify-center">
              <Cpu className="w-4 h-4 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-foreground">AI Provider Management</h2>
              <p className="text-[10px] text-muted-foreground">Configure, test and manage all AI providers</p>
            </div>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg bg-secondary/60 hover:bg-secondary flex items-center justify-center">
            <X className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-2 bg-secondary/30 border-b border-border/30 flex-shrink-0">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${tab === t ? 'studio-gradient text-white shadow-sm' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'}`}>
              {t === 'Providers' && <Settings2 className="w-3 h-3 inline mr-1" />}
              {t === 'Ollama' && <Brain className="w-3 h-3 inline mr-1" />}
              {t === 'Defaults' && <Zap className="w-3 h-3 inline mr-1" />}
              {t === 'Advanced' && <Cpu className="w-3 h-3 inline mr-1" />}
              {t}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {tab === 'Providers' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground mb-3">
                Configure your AI providers. Keys are stored locally in your browser and never sent to our servers.
              </p>
              {PROVIDER_ORDER.map(p => <ProviderCard key={p} provider={p} />)}
            </div>
          )}

          {tab === 'Ollama' && (
            <div>
              <p className="text-xs text-muted-foreground mb-4">
                Ollama lets you run powerful AI models locally or via cloud. Local Ollama is completely free and private.
              </p>
              <OllamaPanel />
            </div>
          )}

          {tab === 'Defaults' && (
            <div className="space-y-4">
              <div className="bg-secondary/30 rounded-xl p-4 border border-border/40">
                <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2"><Bot className="w-4 h-4 text-primary" />Chat Default</h3>
                <p className="text-xs text-muted-foreground mb-3">Which provider handles Avni AI assistant conversations.</p>
                <div className="flex flex-wrap gap-2">
                  {(['gemini', 'openrouter', 'openai', 'grok'] as AIProvider[]).map(p => (
                    <button key={p} onClick={() => dispatch({ type: 'SET_ACTIVE_BOT_PROVIDER', provider: p })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${state.globalDefaults.chatDefault === p ? 'studio-gradient text-white border-transparent' : 'border-border text-muted-foreground hover:border-primary/40'}`}>
                      {PROVIDER_META[p]?.icon} {state.providers[p]?.label ?? p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-secondary/30 rounded-xl p-4 border border-border/40">
                <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2"><Image className="w-4 h-4 text-primary" />Image Generation Chain</h3>
                <p className="text-xs text-muted-foreground mb-2">Priority order for text-to-image requests.</p>
                <div className="flex flex-wrap gap-1.5">
                  {state.globalDefaults.generationFallback.map((p, i) => (
                    <div key={p} className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-lg text-xs text-primary">
                      <span className="w-4 h-4 rounded-full bg-primary/30 flex items-center justify-center text-[10px] font-bold">{i+1}</span>
                      {state.providers[p]?.label ?? p}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-secondary/30 rounded-xl p-4 border border-border/40">
                <h3 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-2"><Wand2 className="w-4 h-4 text-primary" />Image Editing Chain</h3>
                <p className="text-xs text-muted-foreground mb-2">Priority order for image edit requests.</p>
                <div className="flex flex-wrap gap-1.5">
                  {state.globalDefaults.editingFallback.map((p, i) => (
                    <div key={p} className="flex items-center gap-1.5 px-2.5 py-1 bg-primary/10 border border-primary/20 rounded-lg text-xs text-primary">
                      <span className="w-4 h-4 rounded-full bg-primary/30 flex items-center justify-center text-[10px] font-bold">{i+1}</span>
                      {state.providers[p]?.label ?? p}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-secondary/30 rounded-xl p-4 border border-border/40">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">Use OnSpace AI as Fallback</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">When all external providers fail, fall back to OnSpace built-in AI (uses credits).</p>
                  </div>
                  <Toggle checked={state.onspaceAsFallback} onChange={v => dispatch({ type: 'SET_ONSPACE_FALLBACK', enabled: v })} />
                </div>
              </div>
            </div>
          )}

          {tab === 'Advanced' && (
            <div className="space-y-4">
              <div className="bg-secondary/30 rounded-xl p-4 border border-border/40 space-y-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Cpu className="w-4 h-4 text-primary" />Request Settings</h3>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Max Fallback Attempts</label>
                  <input type="number" min={1} max={7}
                    value={state.advancedSettings.maxFallbackAttempts}
                    onChange={e => dispatch({ type: 'SET_ADVANCED', settings: { maxFallbackAttempts: Number(e.target.value) } })}
                    className="w-24 bg-background/60 border border-border rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-foreground">Debug Mode</p>
                    <p className="text-[10px] text-muted-foreground">Log all provider requests to console.</p>
                  </div>
                  <Toggle checked={state.advancedSettings.debugMode} onChange={v => dispatch({ type: 'SET_ADVANCED', settings: { debugMode: v } })} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-foreground">Stream Chat Responses</p>
                    <p className="text-[10px] text-muted-foreground">Real-time token streaming (when supported).</p>
                  </div>
                  <Toggle checked={state.advancedSettings.streamChatResponses} onChange={v => dispatch({ type: 'SET_ADVANCED', settings: { streamChatResponses: v } })} />
                </div>
              </div>

              <div className="bg-secondary/30 rounded-xl p-4 border border-border/40">
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><Settings2 className="w-4 h-4 text-primary" />Studio Control Mode</h3>
                <div className="flex flex-col gap-2">
                  {([['fully_agentic', 'Fully Agentic', 'AI auto-selects providers, models and triggers actions'], ['half_manual', 'Half Manual', 'AI suggests, user confirms'], ['fully_manual', 'Fully Manual', 'AI gives guidance only, no auto-actions']] as const).map(([val, label, desc]) => (
                    <button key={val} onClick={() => dispatch({ type: 'SET_STUDIO_CONTROL_MODE', mode: val })}
                      className={`text-left px-3 py-2.5 rounded-xl border transition-all ${state.studioControlMode === val ? 'border-primary/50 bg-primary/10' : 'border-border/40 hover:border-primary/30'}`}>
                      <p className="text-xs font-semibold text-foreground">{label}</p>
                      <p className="text-[10px] text-muted-foreground">{desc}</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
