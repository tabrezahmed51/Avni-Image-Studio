import type { AIProvider } from '../types/aiIntegration.types';
import { PROVIDER_ICONS } from '../services/providerRegistry';
import { useAIIntegrationStore } from '../store/aiIntegrationStore';
import ProviderStatusBadge from './ProviderStatusBadge';

interface AIProviderTabsProps {
  active: AIProvider;
  onChange: (provider: AIProvider) => void;
}

const ALL_PROVIDERS: AIProvider[] = ['openrouter', 'openai', 'gemini', 'huggingface', 'grok', 'qwen', 'comfyui'];

export default function AIProviderTabs({ active, onChange }: AIProviderTabsProps) {
  const { state } = useAIIntegrationStore();

  return (
    <div className="flex flex-col gap-1 w-36 shrink-0">
      {ALL_PROVIDERS.map(p => {
        const config = state.providers[p];
        const isActive = active === p;
        return (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-left transition-all w-full group ${
              isActive ? 'studio-gradient text-white shadow-md' : 'hover:bg-secondary/60 text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="text-base shrink-0">{PROVIDER_ICONS[p]}</span>
            <span className={`text-xs font-medium truncate ${isActive ? 'text-white' : ''}`}>{config.label}</span>
            {config.settings.enabled && config.settings.status === 'connected' && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
            )}
          </button>
        );
      })}
    </div>
  );
}
