import { useMemo } from 'react';
import type { AIProvider, AIFeature } from '../types/aiIntegration.types';
import { useAIIntegrationStore } from '../store/aiIntegrationStore';
import { resolveProviderChain } from '../services/providerRouter';

export function useFallbackRouting(feature: AIFeature) {
  const { state, dispatch } = useAIIntegrationStore();

  const chain = useMemo(() => {
    const req = { feature };
    return resolveProviderChain(req, state);
  }, [state, feature]);

  const setGenerationFallback = (newChain: AIProvider[]) =>
    dispatch({ type: 'SET_GLOBAL_FALLBACK', key: 'generationFallback', chain: newChain });

  const setEditingFallback = (newChain: AIProvider[]) =>
    dispatch({ type: 'SET_GLOBAL_FALLBACK', key: 'editingFallback', chain: newChain });

  return {
    chain,
    generationFallback: state.globalDefaults.generationFallback,
    editingFallback: state.globalDefaults.editingFallback,
    chatDefault: state.globalDefaults.chatDefault,
    setGenerationFallback,
    setEditingFallback,
  };
}
