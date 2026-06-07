import { useState } from 'react';
import { ChevronDown, ChevronUp, Power } from 'lucide-react';
import type { AIProvider, ProviderConfig, AIFeature } from '../types/aiIntegration.types';
import { PROVIDER_ICONS } from '../services/providerRegistry';
import ProviderStatusBadge from './ProviderStatusBadge';
import ProviderHelpText from './ProviderHelpText';
import ProviderAuthFields from './ProviderAuthFields';
import ProviderEndpointFields from './ProviderEndpointFields';
import ProviderModelSelector from './ProviderModelSelector';
import ProviderCapabilitiesList from './ProviderCapabilitiesList';
import ProviderConnectionTestButton from './ProviderConnectionTestButton';

interface AIProviderCardProps {
  provider: AIProvider;
  config: ProviderConfig;
  onToggleEnabled: (enabled: boolean) => void;
  onAuthChange: (auth: Partial<ProviderConfig['auth']>) => void;
  onEndpointsChange: (endpoints: Partial<ProviderConfig['endpoints']>) => void;
  onModelSelect: (feature: AIFeature, modelId: string) => void;
}

export default function AIProviderCard({
  provider, config, onToggleEnabled, onAuthChange, onEndpointsChange, onModelSelect,
}: AIProviderCardProps) {
  const [expanded, setExpanded] = useState(false);
  const showEndpoints = config.capabilities.customEndpoint || config.capabilities.selfHosted || config.capabilities.gradioSpace || provider === 'comfyui';

  return (
    <div className={`rounded-2xl border transition-all duration-200 overflow-hidden ${config.settings.enabled ? 'border-primary/25 bg-card' : 'border-border/30 bg-secondary/20'}`}>
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        <span className="text-2xl w-8 text-center">{PROVIDER_ICONS[provider]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-foreground">{config.label}</p>
            <ProviderStatusBadge status={config.settings.status} />
          </div>
          {config.settings.lastError && config.settings.status !== 'connected' && (
            <p className="text-[10px] text-red-400/80 mt-0.5 truncate">{config.settings.lastError}</p>
          )}
          {config.settings.lastTestedAt && config.settings.status === 'connected' && (
            <p className="text-[10px] text-muted-foreground/60 mt-0.5">
              Last tested {new Date(config.settings.lastTestedAt).toLocaleTimeString()}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Enable toggle */}
          <button
            onClick={() => onToggleEnabled(!config.settings.enabled)}
            className={`relative w-9 h-5 rounded-full transition-colors ${config.settings.enabled ? 'bg-primary' : 'bg-secondary border border-border/60'}`}
            aria-label={config.settings.enabled ? 'Disable provider' : 'Enable provider'}
          >
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${config.settings.enabled ? 'translate-x-4' : 'translate-x-0.5'}`} />
          </button>
          {/* Expand */}
          <button
            onClick={() => setExpanded(e => !e)}
            className="w-7 h-7 rounded-lg bg-secondary/60 hover:bg-secondary flex items-center justify-center transition-colors"
          >
            {expanded ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
          </button>
        </div>
      </div>

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t border-border/20 pt-4">
          {/* Help */}
          <ProviderHelpText provider={provider} />

          {/* Capabilities */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Capabilities</p>
            <ProviderCapabilitiesList capabilities={config.capabilities} />
          </div>

          {/* Auth */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Authentication</p>
            <ProviderAuthFields provider={provider} auth={config.auth} onChange={onAuthChange} />
          </div>

          {/* Endpoints */}
          {showEndpoints && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Endpoints</p>
              <ProviderEndpointFields provider={provider} endpoints={config.endpoints} capabilities={config.capabilities} onChange={onEndpointsChange} />
            </div>
          )}

          {/* Models */}
          {config.models.length > 0 && (
            <ProviderModelSelector provider={provider} onSelect={onModelSelect} />
          )}

          {/* Test connection */}
          <ProviderConnectionTestButton provider={provider} config={config} />
        </div>
      )}
    </div>
  );
}
