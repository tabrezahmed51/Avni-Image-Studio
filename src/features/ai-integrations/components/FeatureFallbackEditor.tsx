import type { AIProvider } from '../types/aiIntegration.types';
import { useAIIntegrationStore } from '../store/aiIntegrationStore';
import { PROVIDER_ICONS } from '../services/providerRegistry';
import { moveUp, moveDown } from '../utils/reorderProviders';
import { ArrowUp, ArrowDown } from 'lucide-react';

const FEATURE_LABELS = {
  generation: 'Image Generation Chain',
  editing: 'Image Editing Chain',
};

function ChainEditor({
  label, chain, allProviders, onUpdate,
}: {
  label: string;
  chain: AIProvider[];
  allProviders: AIProvider[];
  onUpdate: (newChain: AIProvider[]) => void;
}) {
  const { state } = useAIIntegrationStore();

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</p>
      <div className="space-y-1.5">
        {chain.map((p, i) => {
          const config = state.providers[p];
          return (
            <div key={p} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 border border-border/40">
              <span className="text-base">{PROVIDER_ICONS[p]}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground">{config?.label ?? p}</p>
                <p className="text-[10px] text-muted-foreground">Priority {i + 1}</p>
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => onUpdate(moveUp(chain, i))}
                  disabled={i === 0}
                  className="w-6 h-6 rounded-md bg-secondary hover:bg-secondary/80 disabled:opacity-30 flex items-center justify-center"
                >
                  <ArrowUp className="w-3 h-3 text-muted-foreground" />
                </button>
                <button
                  onClick={() => onUpdate(moveDown(chain, i))}
                  disabled={i === chain.length - 1}
                  className="w-6 h-6 rounded-md bg-secondary hover:bg-secondary/80 disabled:opacity-30 flex items-center justify-center"
                >
                  <ArrowDown className="w-3 h-3 text-muted-foreground" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface FeatureFallbackEditorProps {
  generationChain: AIProvider[];
  editingChain: AIProvider[];
  onUpdateGeneration: (chain: AIProvider[]) => void;
  onUpdateEditing: (chain: AIProvider[]) => void;
}

export default function FeatureFallbackEditor({
  generationChain, editingChain, onUpdateGeneration, onUpdateEditing,
}: FeatureFallbackEditorProps) {
  const { state } = useAIIntegrationStore();
  const allProviders = Object.keys(state.providers) as AIProvider[];

  return (
    <div className="space-y-5">
      <ChainEditor label={FEATURE_LABELS.generation} chain={generationChain} allProviders={allProviders} onUpdate={onUpdateGeneration} />
      <ChainEditor label={FEATURE_LABELS.editing} chain={editingChain} allProviders={allProviders} onUpdate={onUpdateEditing} />
    </div>
  );
}
