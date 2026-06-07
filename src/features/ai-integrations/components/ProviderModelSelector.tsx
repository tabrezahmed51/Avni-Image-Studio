import type { AIProvider, AIFeature, ModelOption } from '../types/aiIntegration.types';
import { FEATURE_LABELS } from '../services/providerRegistry';
import { useProviderModels } from '../hooks/useProviderModels';

const GENERATIVE_FEATURES: AIFeature[] = ['text_to_image', 'image_edit', 'image_to_image', 'chat', 'prompt_enhance', 'inspire'];

interface ProviderModelSelectorProps {
  provider: AIProvider;
  onSelect: (feature: AIFeature, modelId: string) => void;
}

function FeatureModelRow({ provider, feature, onSelect }: { provider: AIProvider; feature: AIFeature; onSelect: (f: AIFeature, m: string) => void }) {
  const { models, preferredModel, defaultModel } = useProviderModels(provider, feature);
  if (!models.length) return null;

  const currentModel = preferredModel ?? defaultModel?.id ?? '';

  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] text-muted-foreground shrink-0 w-28">{FEATURE_LABELS[feature]}</span>
      <select
        value={currentModel}
        onChange={(e) => onSelect(feature, e.target.value)}
        className="flex-1 bg-secondary/50 border border-border/60 rounded-lg px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
      >
        {models.map((m) => (
          <option key={m.id} value={m.id}>{m.label}{m.isDefault ? ' (default)' : ''}</option>
        ))}
      </select>
    </div>
  );
}

export default function ProviderModelSelector({ provider, onSelect }: ProviderModelSelectorProps) {
  const { models } = useProviderModels(provider);
  if (!models.length) return null;

  const featuresWithModels = GENERATIVE_FEATURES.filter(f =>
    models.some(m => m.feature.includes(f))
  );

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Default Models by Feature</p>
      <div className="space-y-2">
        {featuresWithModels.map(f => (
          <FeatureModelRow key={f} provider={provider} feature={f} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}
