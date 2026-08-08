import type { AIProvider, ProviderConfig, ValidationResult, AIRouteRequest, AIFeature } from '../types/aiIntegration.types';

export function validateProviderConfig(config: ProviderConfig): ValidationResult {
  const errors: string[] = [];
  const { provider, auth, endpoints, capabilities } = config;

  // API key required for non-self-hosted
  const hasKey = auth.apiKey || (provider === 'gemini' && import.meta.env.VITE_GEMINI_API_KEY);
  if (!capabilities.selfHosted && !hasKey) {
    errors.push('API key is required');
  }

  // Base URL required for custom/self-hosted
  if ((capabilities.customEndpoint || capabilities.selfHosted) && !endpoints.baseUrl) {
    errors.push('Base URL is required for custom or self-hosted providers');
  }

  // Gradio/HF: base URL required
  if (capabilities.gradioSpace && !endpoints.baseUrl) {
    errors.push('Hugging Face endpoint URL is required');
  }

  // ComfyUI: need base URL
  if (provider === 'comfyui' && !endpoints.baseUrl) {
    errors.push('ComfyUI server URL is required (e.g. http://localhost:8188)');
  }

  // Timeout sanity
  if (endpoints.timeoutMs !== undefined && endpoints.timeoutMs < 1000) {
    errors.push('Timeout must be at least 1000ms');
  }

  return { valid: errors.length === 0, errors };
}

export function validateFeatureRequest(req: AIRouteRequest, config: ProviderConfig): ValidationResult {
  const errors: string[] = [];
  const caps = config.capabilities as Record<string, boolean>;

  if (!caps[req.feature]) {
    errors.push(`Provider ${config.label} does not support feature: ${req.feature}`);
  }

  if (['text_to_image', 'prompt_enhance', 'inspire', 'chat'].includes(req.feature) && !req.prompt) {
    errors.push('Prompt is required for this feature');
  }

  if (['image_edit', 'image_to_image'].includes(req.feature) && !req.image) {
    errors.push('Source image is required for image editing');
  }

  // Chat needs a chat-capable model
  if (req.feature === 'chat' && !caps.chat) {
    errors.push('Provider does not support chat');
  }

  return { valid: errors.length === 0, errors };
}

export function getRequiredFields(provider: AIProvider): string[] {
  switch (provider) {
    case 'comfyui': return ['endpoints.baseUrl'];
    case 'huggingface': return ['auth.apiKey', 'endpoints.baseUrl'];
    default: return ['auth.apiKey'];
  }
}
