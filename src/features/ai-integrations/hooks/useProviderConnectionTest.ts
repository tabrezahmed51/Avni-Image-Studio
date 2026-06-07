import { useState, useCallback } from 'react';
import type { AIProvider, ProviderConfig, ProviderStatus } from '../types/aiIntegration.types';
import { providerClientFactory } from '../services/providerClientFactory';
import { useAIIntegrationStore } from '../store/aiIntegrationStore';

export function useProviderConnectionTest() {
  const { dispatch } = useAIIntegrationStore();
  const [testing, setTesting] = useState<Partial<Record<AIProvider, boolean>>>({});

  const testConnection = useCallback(async (provider: AIProvider, config: ProviderConfig) => {
    setTesting((prev) => ({ ...prev, [provider]: true }));
    dispatch({ type: 'SET_PROVIDER_STATUS', provider, status: 'testing' });

    try {
      const client = providerClientFactory(provider, config);
      const result = await client.testConnection();

      const status: ProviderStatus = result.ok ? 'connected' : 'invalid_key';
      dispatch({
        type: 'SET_PROVIDER_STATUS',
        provider,
        status,
        error: result.error,
      });
      return result;
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error';
      dispatch({ type: 'SET_PROVIDER_STATUS', provider, status: 'offline', error });
      return { ok: false, error };
    } finally {
      setTesting((prev) => ({ ...prev, [provider]: false }));
    }
  }, [dispatch]);

  return { testConnection, testing };
}
