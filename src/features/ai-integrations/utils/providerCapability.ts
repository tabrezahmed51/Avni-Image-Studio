import type { AIProvider, AIFeature, ProviderConfig } from '../types/aiIntegration.types';

/** Check if a provider supports a given feature */
export function supportsFeature(config: ProviderConfig, feature: AIFeature): boolean {
  return Boolean((config.capabilities as Record<string, boolean>)[feature]);
}

/** Get all features a provider supports */
export function getSupportedFeatures(config: ProviderConfig): AIFeature[] {
  const features: AIFeature[] = ['chat', 'text_to_image', 'image_to_image', 'image_edit', 'prompt_enhance', 'inspire'];
  return features.filter(f => supportsFeature(config, f));
}

/** Get providers that support a given feature */
export function getProvidersForFeature(
  providers: Record<AIProvider, ProviderConfig>,
  feature: AIFeature
): AIProvider[] {
  return (Object.entries(providers) as [AIProvider, ProviderConfig][])
    .filter(([, config]) => config.settings.enabled && supportsFeature(config, feature))
    .map(([id]) => id);
}
