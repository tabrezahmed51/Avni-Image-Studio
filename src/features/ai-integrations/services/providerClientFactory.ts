import type { AIProvider, ProviderConfig, ProviderClient, AIRouteRequest, AIRouteResponse } from '../types/aiIntegration.types';

// ─── Base client factory ──────────────────────────────────────────────
// Note: In production these calls go through edge functions (OnSpace Cloud).
// The client factory provides testConnection + routing metadata.
// Actual API invocations are proxied via Supabase edge functions.

function buildHeaders(config: ProviderConfig): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.auth.apiKey) {
    const headerName = config.auth.apiKeyHeader ?? 'Authorization';
    headers[headerName] = headerName === 'Authorization'
      ? `Bearer ${config.auth.apiKey}`
      : config.auth.apiKey;
  }
  return headers;
}

function buildTestUrl(config: ProviderConfig): string | null {
  const base = config.endpoints.baseUrl;
  if (!base) return null;
  const health = config.endpoints.healthPath;
  if (health) return `${base}${health}`;
  const models = config.endpoints.modelsPath ?? '/models';
  return `${base}${models}`;
}

// ─── Generic REST client ──────────────────────────────────────────────
function createGenericClient(config: ProviderConfig): ProviderClient {
  return {
    async testConnection() {
      if (!config.auth.apiKey && !config.endpoints.baseUrl) {
        return { ok: false, error: 'No API key or endpoint configured' };
      }
      if (!config.auth.apiKey) {
        return { ok: false, error: 'API key is required' };
      }
      // Validate API key format heuristically
      if (config.auth.apiKey.length < 8) {
        return { ok: false, error: 'API key appears too short' };
      }
      const url = buildTestUrl(config);
      if (!url) return { ok: false, error: 'No test endpoint configured' };
      try {
        const res = await fetch(url, {
          method: 'GET',
          headers: buildHeaders(config),
          signal: AbortSignal.timeout(config.endpoints.timeoutMs ?? 10000),
        });
        if (res.status === 401) return { ok: false, error: 'Invalid API key (401 Unauthorized)' };
        if (res.status === 403) return { ok: false, error: 'Forbidden — check key permissions (403)' };
        if (res.status === 429) return { ok: false, error: 'Rate limited (429) — try again later' };
        if (res.ok || res.status === 404) return { ok: true };
        return { ok: false, error: `HTTP ${res.status}` };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Connection failed';
        if (msg.includes('abort') || msg.includes('timeout')) return { ok: false, error: 'Connection timed out' };
        return { ok: false, error: msg };
      }
    },
    async chat(req: AIRouteRequest): Promise<AIRouteResponse> {
      return { provider: config.provider, model: 'unknown', output: null, usedFallback: false };
    },
    async generateTextToImage(req: AIRouteRequest): Promise<AIRouteResponse> {
      return { provider: config.provider, model: 'unknown', output: null, usedFallback: false };
    },
    async generateImageEdit(req: AIRouteRequest): Promise<AIRouteResponse> {
      return { provider: config.provider, model: 'unknown', output: null, usedFallback: false };
    },
  };
}

// ─── ComfyUI special client ───────────────────────────────────────────
function createComfyUIClient(config: ProviderConfig): ProviderClient {
  return {
    async testConnection() {
      const base = config.endpoints.baseUrl;
      if (!base) return { ok: false, error: 'ComfyUI base URL is required' };
      const healthPath = config.endpoints.healthPath ?? '/system_stats';
      try {
        const res = await fetch(`${base}${healthPath}`, {
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) return { ok: true };
        return { ok: false, error: `HTTP ${res.status} — is ComfyUI running?` };
      } catch {
        return { ok: false, error: 'Cannot reach ComfyUI — check your base URL and that the server is running' };
      }
    },
    async generateTextToImage(req: AIRouteRequest): Promise<AIRouteResponse> {
      return { provider: 'comfyui', model: 'workflow_t2i', output: null, usedFallback: false };
    },
  };
}

// ─── Factory entry point ──────────────────────────────────────────────
export function providerClientFactory(provider: AIProvider, config: ProviderConfig): ProviderClient {
  if (provider === 'comfyui') return createComfyUIClient(config);
  return createGenericClient(config);
}
