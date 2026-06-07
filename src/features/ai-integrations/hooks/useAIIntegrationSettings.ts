import { useAIIntegrationStore } from '../store/aiIntegrationStore';
import type { AIIntegrationAction, AIProvider, AIFeature, ProviderAuthConfig, ProviderEndpointConfig } from '../types/aiIntegration.types';

export function useAIIntegrationSettings() {
  const { state, dispatch, reset } = useAIIntegrationStore();

  const setProviderEnabled = (provider: AIProvider, enabled: boolean) =>
    dispatch({ type: 'SET_PROVIDER_ENABLED', provider, enabled });

  const setProviderAuth = (provider: AIProvider, auth: Partial<ProviderAuthConfig>) =>
    dispatch({ type: 'SET_PROVIDER_AUTH', provider, auth });

  const setProviderEndpoints = (provider: AIProvider, endpoints: Partial<ProviderEndpointConfig>) =>
    dispatch({ type: 'SET_PROVIDER_ENDPOINTS', provider, endpoints });

  const setProviderModel = (provider: AIProvider, feature: AIFeature, modelId: string) =>
    dispatch({ type: 'SET_PROVIDER_MODEL', provider, feature, modelId });

  const setGlobalFallback = (key: 'generationFallback' | 'editingFallback', chain: AIProvider[]) =>
    dispatch({ type: 'SET_GLOBAL_FALLBACK', key, chain });

  const setActiveBotProvider = (provider: AIProvider) =>
    dispatch({ type: 'SET_ACTIVE_BOT_PROVIDER', provider });

  const setAdvanced = (settings: Partial<typeof state.advancedSettings>) =>
    dispatch({ type: 'SET_ADVANCED', settings });

  const enabledProviders = (Object.keys(state.providers) as AIProvider[]).filter(
    (p) => state.providers[p].settings.enabled
  );

  return {
    state,
    dispatch,
    reset,
    setProviderEnabled,
    setProviderAuth,
    setProviderEndpoints,
    setProviderModel,
    setGlobalFallback,
    setActiveBotProvider,
    setAdvanced,
    enabledProviders,
  };
}
