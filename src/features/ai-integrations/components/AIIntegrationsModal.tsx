import { useState, useEffect } from 'react';
import { X, Settings, Cpu, Layers, SlidersHorizontal, RotateCcw, Brain, Zap, Shield, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { AIProvider, StudioControlMode } from '../types/aiIntegration.types';
import { useAIIntegrationSettings } from '../hooks/useAIIntegrationSettings';
import { useAIIntegrationStore } from '../store/aiIntegrationStore';
import AIProviderTabs from './AIProviderTabs';
import AIProviderCard from './AIProviderCard';
import FeatureFallbackEditor from './FeatureFallbackEditor';
import FeatureDefaultSelector from './FeatureDefaultSelector';
import AdvancedSettingsPanel from './AdvancedSettingsPanel';
import ProviderStatusBadge from './ProviderStatusBadge';
import { PROVIDER_ICONS } from '../services/providerRegistry';

type SettingsTab = 'general' | 'integrations' | 'fallbacks' | 'advanced';

interface AIIntegrationsModalProps {
  open: boolean;
  onClose: () => void;
}

const TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: 'general', label: 'General', icon: Settings },
  { id: 'integrations', label: 'AI Integrations', icon: Cpu },
  { id: 'fallbacks', label: 'Defaults & Fallbacks', icon: Layers },
  { id: 'advanced', label: 'Advanced', icon: SlidersHorizontal },
];

const ALL_PROVIDERS: AIProvider[] = ['openrouter', 'openai', 'gemini', 'huggingface', 'grok', 'qwen', 'comfyui'];

const CONTROL_MODES: { value: StudioControlMode; label: string; desc: string; color: string; icon: React.ElementType }[] = [
  {
    value: 'fully_agentic',
    label: 'Fully Agentic',
    desc: 'AI auto-selects providers, models, and triggers actions with minimal input.',
    color: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
    icon: Brain,
  },
  {
    value: 'half_manual',
    label: 'Half Manual',
    desc: 'You choose the task; AI assists with optimization and suggests actions.',
    color: 'border-amber-500/40 bg-amber-500/10 text-amber-400',
    icon: Zap,
  },
  {
    value: 'fully_manual',
    label: 'Fully Manual',
    desc: 'AI gives guidance only. No automatic provider selection or action triggering.',
    color: 'border-sky-500/40 bg-sky-500/10 text-sky-400',
    icon: Shield,
  },
];

export default function AIIntegrationsModal({ open, onClose }: AIIntegrationsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [activeProvider, setActiveProvider] = useState<AIProvider>('gemini');

  const {
    state, reset,
    setProviderEnabled, setProviderAuth, setProviderEndpoints, setProviderModel,
    setGlobalFallback, setActiveBotProvider, setAdvanced,
  } = useAIIntegrationSettings();

  const { dispatch } = useAIIntegrationStore();

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const handleSave = () => {
    toast.success('AI Integration settings saved!');
    onClose();
  };

  const handleReset = () => {
    reset();
    toast.success('Settings reset to defaults');
  };

  if (!open) return null;

  // ── GENERAL TAB ──────────────────────────────────────────────────────
  const GeneralTab = () => (
    <div className="space-y-5">
      {/* Studio Control Mode */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Studio Control Mode</h3>
        <p className="text-xs text-muted-foreground mb-3">Controls how much the Avni AI agent auto-manages provider selection and actions.</p>
        <div className="grid grid-cols-1 gap-2">
          {CONTROL_MODES.map(mode => {
            const Icon = mode.icon;
            const isActive = state.studioControlMode === mode.value;
            return (
              <button
                key={mode.value}
                onClick={() => dispatch({ type: 'SET_STUDIO_CONTROL_MODE', mode: mode.value })}
                className={`flex items-start gap-3 px-3 py-3 rounded-xl border transition-all text-left ${isActive ? mode.color : 'border-border/30 bg-secondary/20 hover:bg-secondary/40'}`}
              >
                <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? '' : 'text-muted-foreground'}`} />
                <div>
                  <p className={`text-xs font-semibold ${isActive ? '' : 'text-foreground'}`}>{mode.label}</p>
                  <p className={`text-[10px] leading-relaxed mt-0.5 ${isActive ? 'opacity-80' : 'text-muted-foreground'}`}>{mode.desc}</p>
                </div>
                {isActive && <div className="ml-auto w-2 h-2 rounded-full bg-current shrink-0 mt-1" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Provider overview */}
      <div className="border-t border-border/30 pt-4">
        <h3 className="text-sm font-semibold text-foreground mb-1">Provider Overview</h3>
        <p className="text-xs text-muted-foreground mb-3">Click a row to configure. External providers replace OnSpace AI credits.</p>
        <div className="space-y-1.5">
          {ALL_PROVIDERS.map(p => {
            const config = state.providers[p];
            return (
              <button
                key={p}
                onClick={() => { setActiveProvider(p); setActiveTab('integrations'); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/40 hover:bg-secondary/70 border border-border/30 hover:border-primary/30 transition-all text-left"
              >
                <span className="text-base">{PROVIDER_ICONS[p]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{config.label}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {config.auth.apiKey ? '••••' + config.auth.apiKey.slice(-4) : 'No key'}
                    {' · '}
                    {config.settings.enabled ? 'Enabled' : 'Disabled'}
                  </p>
                </div>
                <ProviderStatusBadge status={config.settings.status} />
              </button>
            );
          })}
        </div>
      </div>

      {/* OnSpace fallback */}
      <div className="border-t border-border/30 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Use OnSpace AI as Last-Resort Fallback</h3>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              If all external providers fail, fall back to OnSpace AI (uses OnSpace credits). <strong className="text-amber-400">Currently OFF</strong> by default — enable only if needed.
            </p>
          </div>
          <button
            onClick={() => dispatch({ type: 'SET_ONSPACE_FALLBACK', enabled: !state.onspaceAsFallback })}
            className={`relative w-10 h-5.5 rounded-full transition-colors shrink-0 mt-0.5 ${state.onspaceAsFallback ? 'bg-amber-500' : 'bg-secondary border border-border/60'}`}
            style={{ width: 40, height: 22 }}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${state.onspaceAsFallback ? 'translate-x-5' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {state.onspaceAsFallback && (
          <div className="mt-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300/90 flex items-start gap-2">
            <HelpCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            OnSpace AI fallback is active — generation may use OnSpace credits if external providers fail.
          </div>
        )}
      </div>

      {/* Active bot */}
      <div className="border-t border-border/30 pt-4">
        <h3 className="text-sm font-semibold text-foreground mb-1">Active Bot Provider</h3>
        <p className="text-xs text-muted-foreground">
          Currently <strong className="text-foreground">{state.providers[state.activeBotProvider]?.label ?? state.activeBotProvider}</strong> for Avni AI assistant. Change in Defaults & Fallbacks tab.
        </p>
      </div>
    </div>
  );

  // ── INTEGRATIONS TAB ─────────────────────────────────────────────────
  const IntegrationsTab = () => (
    <div className="flex gap-4 min-h-0">
      <AIProviderTabs active={activeProvider} onChange={setActiveProvider} />
      <div className="flex-1 min-w-0 overflow-y-auto">
        <AIProviderCard
          provider={activeProvider}
          config={state.providers[activeProvider]}
          onToggleEnabled={(enabled) => setProviderEnabled(activeProvider, enabled)}
          onAuthChange={(auth) => setProviderAuth(activeProvider, auth)}
          onEndpointsChange={(ep) => setProviderEndpoints(activeProvider, ep)}
          onModelSelect={(feature, modelId) => setProviderModel(activeProvider, feature, modelId)}
        />
        {/* Quick setup guide */}
        <div className="mt-3 px-3 py-2.5 rounded-xl bg-secondary/30 border border-border/30">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Quick Setup</p>
          <ol className="text-[11px] text-muted-foreground/80 space-y-1 list-decimal list-inside leading-relaxed">
            <li>Enable the provider toggle above</li>
            <li>Paste your API key in Authentication</li>
            <li>Click <span className="text-foreground font-medium">Test Connection</span></li>
            <li>Save Settings — generation now uses this provider</li>
          </ol>
        </div>
      </div>
    </div>
  );

  // ── FALLBACKS TAB ────────────────────────────────────────────────────
  const FallbacksTab = () => (
    <div className="space-y-6">
      <FeatureDefaultSelector
        activeBotProvider={state.activeBotProvider}
        chatDefault={state.globalDefaults.chatDefault}
        onSetBotProvider={setActiveBotProvider}
      />
      <div className="border-t border-border/30 pt-4">
        <h3 className="text-sm font-semibold text-foreground mb-1">Fallback Chains</h3>
        <p className="text-xs text-muted-foreground mb-4">Reorder which providers are tried in sequence. Only retryable errors (timeout, 429, 5xx) trigger fallback.</p>
        <FeatureFallbackEditor
          generationChain={state.globalDefaults.generationFallback}
          editingChain={state.globalDefaults.editingFallback}
          onUpdateGeneration={(chain) => setGlobalFallback('generationFallback', chain)}
          onUpdateEditing={(chain) => setGlobalFallback('editingFallback', chain)}
        />
      </div>
    </div>
  );

  // ── ADVANCED TAB ─────────────────────────────────────────────────────
  const AdvancedTab = () => (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Advanced Settings</h3>
        <p className="text-xs text-muted-foreground mb-4">Fine-tune request behavior across all providers.</p>
        <AdvancedSettingsPanel
          maxFallbackAttempts={state.advancedSettings.maxFallbackAttempts}
          streamChatResponses={state.advancedSettings.streamChatResponses}
          imageUploadStrategy={state.advancedSettings.imageUploadStrategy}
          onChange={setAdvanced}
        />
      </div>

      {/* Debug mode */}
      <div className="pt-3 border-t border-border/30">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-foreground">Debug Mode</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">Log detailed provider routing info to browser console</p>
          </div>
          <button
            onClick={() => setAdvanced({ debugMode: !state.advancedSettings.debugMode })}
            className={`relative rounded-full transition-colors ${state.advancedSettings.debugMode ? 'bg-primary' : 'bg-secondary border border-border/60'}`}
            style={{ width: 36, height: 20 }}
          >
            <span className={`absolute top-0.5 w-3.5 h-3.5 rounded-full bg-white shadow transition-transform ${state.advancedSettings.debugMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
        </div>
        {state.advancedSettings.debugMode && (
          <p className="mt-1.5 text-[10px] text-primary/70">Check browser console (F12 → Console) for routing logs.</p>
        )}
      </div>

      <div className="pt-4 border-t border-border/30 space-y-1.5">
        <h3 className="text-sm font-semibold text-foreground">Reset to Defaults</h3>
        <p className="text-xs text-muted-foreground">Clear all provider configs and restore factory defaults. API keys will be removed.</p>
        <Button
          onClick={handleReset}
          variant="outline"
          size="sm"
          className="mt-2 border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50 text-xs"
        >
          <RotateCcw className="w-3.5 h-3.5 mr-1.5" />Reset All Settings
        </Button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div
        className="relative z-10 w-full max-w-2xl max-h-[88vh] flex flex-col rounded-2xl bg-card border border-border/40 shadow-2xl overflow-hidden animate-fadeUp"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/30 flex-shrink-0 studio-gradient">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <Brain className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">AI Integrations & Settings</h2>
            <p className="text-[11px] text-white/70">Configure providers, control mode, fallbacks & advanced settings</p>
          </div>
          <button onClick={onClose} className="ml-auto w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors">
            <X className="w-3.5 h-3.5 text-white" />
          </button>
        </div>

        {/* Tab nav */}
        <div className="flex gap-1 px-4 pt-3 pb-0 border-b border-border/20 flex-shrink-0 overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-xs font-medium whitespace-nowrap transition-all border-b-2 mb-[-1px] ${
                  isActive ? 'text-primary border-primary bg-primary/5' : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />{tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0">
          {activeTab === 'general' && <GeneralTab />}
          {activeTab === 'integrations' && <IntegrationsTab />}
          {activeTab === 'fallbacks' && <FallbacksTab />}
          {activeTab === 'advanced' && <AdvancedTab />}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-border/30 flex-shrink-0 bg-secondary/20">
          <p className="text-[10px] text-muted-foreground">
            API keys stored in browser localStorage. Never sent to OnSpace servers.
          </p>
          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline" size="sm" className="text-xs border-border h-auto py-1.5 px-3">Cancel</Button>
            <Button onClick={handleSave} size="sm" className="studio-gradient text-white border-0 text-xs h-auto py-1.5 px-4 hover:opacity-90">Save Settings</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
