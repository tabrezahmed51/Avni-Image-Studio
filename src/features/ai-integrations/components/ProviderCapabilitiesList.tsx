import { Check, X } from 'lucide-react';
import type { ProviderCapabilities } from '../types/aiIntegration.types';
import { CAPABILITY_LABELS } from '../services/providerRegistry';

interface ProviderCapabilitiesListProps {
  capabilities: ProviderCapabilities;
}

export default function ProviderCapabilitiesList({ capabilities }: ProviderCapabilitiesListProps) {
  const entries = Object.entries(capabilities) as [keyof ProviderCapabilities, boolean][];
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {entries.map(([key, supported]) => (
        <div key={key} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] ${supported ? 'bg-emerald-500/8 text-emerald-400' : 'bg-secondary/40 text-muted-foreground/50'}`}>
          {supported
            ? <Check className="w-3 h-3 shrink-0" />
            : <X className="w-3 h-3 shrink-0 opacity-50" />
          }
          <span>{CAPABILITY_LABELS[key] ?? key}</span>
        </div>
      ))}
    </div>
  );
}
