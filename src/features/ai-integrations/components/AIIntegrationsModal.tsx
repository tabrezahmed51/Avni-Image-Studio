import { useState, useEffect, useCallback } from 'react';
import { X, Settings, Cpu, Layers, SlidersHorizontal, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import type { AIProvider, AIFeature } from '../types/aiIntegration.types';
import { useAIIntegrationSettings } from '../hooks/useAIIntegrationSettings';
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

export default function AIIntegrationsModal({ open, onClose }: AIIntegrationsModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  const [activeProvider, setActiveProvider] = useState<AIProvider>('openrouter');

  const {
    state, reset,
    setProviderEnabled, setProviderAuth, setProviderEndpoints, setProviderModel,
    setGlobalFallback, setActiveBotProvider, setAdvanced,
  } = useAIIntegrationSettings();

  // Keyboard close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, onClose]);

  // Lock scroll
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
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Provider Overview</h3>
        <p className="text-xs text-muted-foreground mb-3">All 7 AI providers available in Avni Image Studio. Click a row to configure.</p>
        <div className="space-y-2">
          {ALL_PROVIDERS.map(p => {
            const config = state.providers[p];
            return (
              <button
                key={p}
                onClick={() => { setActiveProvider(p); setActiveTab('integrations'); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-secondary/40 hover:bg-secondary/70 border border-border/30 hover:border-primary/30 transition-all text-left group"
              >
                <span className="text-lg">{PROVIDER_ICONS[p]}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground">{config.label}</p>
                  <p className="text-[10px] text-muted-foreground">{config.settings.enabled ? 'Enabled' : 'Disabled'}</p>
                </div>
                <ProviderStatusBadge status={config.settings.status} />
              </button>
            );
          })}
        </div>
      </div>
      <div className="pt-2 border-t border-border/30">
        <h3 className="text-sm font-semibold text-foreground mb-1">Active Bot</h3>
        <p className="text-xs text-muted-foreground mb-2">
          Currently using <strong className="text-foreground">{state.providers[state.activeBotProvider].label}</strong> for Avni AI chat assistant.
        </p>
        <div className="px-3 py-2 rounded-xl bg-primary/10 border border-primary/20 text-xs text-primary">
          🤖 Change this in the "Defaults & Fallbacks" tab.
        </div>
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
        <p className="text-xs text-muted-foreground mb-4">Drag to reorder which providers are tried in sequence when the primary fails. Only retryable errors trigger fallback.</p>
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-card border border-border/40 shadow-2xl overflow-hidden animate-fadeUp"
        style={{ backdropFilter: 'blur(20px)' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-border/30 flex-shrink-0 studio-gradient">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-white" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white">AI Integrations</h2>
            <p className="text-[11px] text-white/70">Configure providers, models, fallbacks & advanced settings</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto w-7 h-7 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
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
                  isActive
                    ? 'text-primary border-primary bg-primary/5'
                    : 'text-muted-foreground border-transparent hover:text-foreground hover:bg-secondary/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
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
            API keys are stored locally in your browser. Never exposed in logs.
          </p>
          <div className="flex gap-2">
            <Button onClick={onClose} variant="outline" size="sm" className="text-xs border-border h-auto py-1.5 px-3">
              Cancel
            </Button>
            <Button onClick={handleSave} size="sm" className="studio-gradient text-white border-0 text-xs h-auto py-1.5 px-4 hover:opacity-90">
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
