import { useMemo } from 'react';
import type { AIProvider, AIFeature, ModelOption } from '../types/aiIntegration.types';
import { useAIIntegrationStore } from '../store/aiIntegrationStore';

export function useProviderModels(provider: AIProvider, feature?: AIFeature) {
  const { state } = useAIIntegrationStore();
  const config = state.providers[provider];

  const models: ModelOption[] = useMemo(() => {
    if (!config) return [];
    if (!feature) return config.models;
    return config.models.filter((m) => m.feature.includes(feature));
  }, [config, feature]);

  const preferredModel = feature ? config?.settings.preferredModelByFeature[feature] : undefined;
  const defaultModel = models.find((m) => m.isDefault) ?? models[0];

  return { models, preferredModel, defaultModel };
}
