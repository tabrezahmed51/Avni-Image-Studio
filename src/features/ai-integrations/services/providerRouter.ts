import type {
  AIProvider, AIFeature, AIIntegrationState, ProviderConfig,
  AIRouteRequest, AIRouteResponse, ProviderClient
} from '../types/aiIntegration.types';

// ─── Provider chain resolution ────────────────────────────────────────
export function resolveProviderChain(req: AIRouteRequest, state: AIIntegrationState): AIProvider[] {
  const chain: AIProvider[] = [];

  // 1. User explicitly selected a provider
  if (req.userSelectedProvider) chain.push(req.userSelectedProvider);

  // 2. Saved preferred provider for the feature
  for (const [pid, config] of Object.entries(state.providers) as [AIProvider, ProviderConfig][]) {
    if (!config.settings.enabled) continue;
    const preferred = config.settings.preferredModelByFeature[req.feature];
    if (preferred && !chain.includes(pid)) {
      chain.push(pid);
      break;
    }
  }

  // 3. Global fallback chain based on feature
  let globalChain: AIProvider[] = [];
  if (req.feature === 'chat') {
    globalChain = [state.globalDefaults.chatDefault];
  } else if (['text_to_image', 'inspire', 'prompt_enhance'].includes(req.feature)) {
    globalChain = state.globalDefaults.generationFallback;
  } else {
    globalChain = state.globalDefaults.editingFallback;
  }

  for (const p of globalChain) {
    if (!chain.includes(p)) chain.push(p);
  }

  // Ensure all remaining enabled providers are included as last resort
  for (const [pid, config] of Object.entries(state.providers) as [AIProvider, ProviderConfig][]) {
    if (config.settings.enabled && !chain.includes(pid)) chain.push(pid);
  }

  return chain;
}

// ─── Retryable error detection ────────────────────────────────────────
export function isRetryableProviderError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('timeout') ||
    msg.includes('429') ||
    msg.includes('rate limit') ||
    msg.includes('503') ||
    msg.includes('502') ||
    msg.includes('504') ||
    msg.includes('offline') ||
    msg.includes('network')
  );
}

// ─── Non-retryable check ──────────────────────────────────────────────
export function isNonRetryableError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes('invalid api key') ||
    msg.includes('401') ||
    msg.includes('403') ||
    msg.includes('unsupported feature') ||
    msg.includes('invalid request')
  );
}

// ─── Error normalizer ─────────────────────────────────────────────────
export function normalizeProviderError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error('An unknown provider error occurred');
}

// ─── Feature support validator ────────────────────────────────────────
export function validateFeatureSupport(provider: AIProvider, feature: AIFeature, state: AIIntegrationState): void {
  const config = state.providers[provider];
  if (!config) throw new Error(`Provider ${provider} not found`);
  const cap = config.capabilities as Record<string, boolean>;
  if (!cap[feature]) throw new Error(`Provider ${config.label} does not support feature: ${feature}`);
}

// ─── Dispatch to provider client ─────────────────────────────────────
export async function dispatchToProvider(
  client: ProviderClient,
  provider: AIProvider,
  req: AIRouteRequest
): Promise<AIRouteResponse> {
  switch (req.feature) {
    case 'text_to_image':
      if (!client.generateTextToImage) throw new Error(`${provider} has no text_to_image implementation`);
      return client.generateTextToImage(req);
    case 'image_edit':
      if (!client.generateImageEdit) throw new Error(`${provider} has no image_edit implementation`);
      return client.generateImageEdit(req);
    case 'image_to_image':
      if (!client.generateImageToImage) throw new Error(`${provider} has no image_to_image implementation`);
      return client.generateImageToImage(req);
    case 'chat':
    case 'inspire':
    case 'prompt_enhance':
      if (!client.chat) throw new Error(`${provider} has no chat implementation`);
      return client.chat(req);
    default:
      throw new Error(`Unknown feature: ${req.feature}`);
  }
}

// ─── Main router ──────────────────────────────────────────────────────
export async function routeRequest(
  req: AIRouteRequest,
  state: AIIntegrationState,
  getClient: (provider: AIProvider) => ProviderClient
): Promise<AIRouteResponse> {
  const chain = resolveProviderChain(req, state);
  let lastError: unknown;
  let usedFallback = false;
  const maxAttempts = state.advancedSettings.maxFallbackAttempts;

  for (const provider of chain.slice(0, maxAttempts + 1)) {
    const config = state.providers[provider];
    if (!config?.settings.enabled) continue;
    if (!(config.capabilities as Record<string, boolean>)[req.feature]) continue;

    const client = getClient(provider);
    try {
      validateFeatureSupport(provider, req.feature, state);
      const result = await dispatchToProvider(client, provider, req);
      return { ...result, usedFallback };
    } catch (error) {
      lastError = error;
      if (isNonRetryableError(error)) break;
      if (!isRetryableProviderError(error)) break;
      usedFallback = true;
    }
  }

  throw normalizeProviderError(lastError);
}
