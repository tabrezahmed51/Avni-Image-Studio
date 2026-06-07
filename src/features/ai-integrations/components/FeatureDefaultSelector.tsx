import type { AIProvider } from '../types/aiIntegration.types';
import { PROVIDER_ICONS } from '../services/providerRegistry';
import { useAIIntegrationStore } from '../store/aiIntegrationStore';

interface FeatureDefaultSelectorProps {
  activeBotProvider: AIProvider;
  chatDefault: AIProvider;
  onSetBotProvider: (provider: AIProvider) => void;
}

export default function FeatureDefaultSelector({
  activeBotProvider, onSetBotProvider,
}: FeatureDefaultSelectorProps) {
  const { state } = useAIIntegrationStore();
  const providers = Object.keys(state.providers) as AIProvider[];
  const chatCapable = providers.filter(p =>
    state.providers[p].capabilities.chat && state.providers[p].settings.enabled
  );

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Default Chat / Bot Provider</p>
      <p className="text-[11px] text-muted-foreground">Powers the Avni AI assistant and prompt enhancement features.</p>
      <div className="grid grid-cols-2 gap-2">
        {(chatCapable.length ? chatCapable : providers.filter(p => state.providers[p].capabilities.chat)).map(p => {
          const config = state.providers[p];
          const isActive = activeBotProvider === p;
          return (
            <button
              key={p}
              onClick={() => onSetBotProvider(p)}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                isActive
                  ? 'studio-gradient text-white border-transparent shadow-md'
                  : 'bg-secondary/40 border-border/40 hover:border-primary/30 text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="text-base">{PROVIDER_ICONS[p]}</span>
              <span className="text-xs font-medium">{config.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
