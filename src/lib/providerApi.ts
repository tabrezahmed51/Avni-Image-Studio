/**
 * providerApi.ts
 * 
 * Unified provider-aware API layer.
 * 
 * Execution priority:
 * 1. User-configured external provider (Gemini, OpenRouter, OpenAI, etc.) 
 * 2. OnSpace AI edge functions (ONLY if onspaceAsFallback is enabled)
 * 
 * All AI actions (generate, edit, inspire, chat) route through this module.
 */

import { getAIIntegrationState } from '@/features/ai-integrations/store/aiIntegrationStore';
import { providerClientFactory } from '@/features/ai-integrations/services/providerClientFactory';
import { ollamaChat, ollamaGenerateWithImage } from '@/lib/ollamaClient';
import { getComputeProviderState } from '@/stores/useComputeProviderStore';
import type { AIProvider, AIFeature, AIIntegrationState, AIRouteResponse } from '@/features/ai-integrations/types/aiIntegration.types';

const DEBUG = '[ProviderApi]';

// ─── Debug logger ─────────────────────────────────────────────────────
function debugLog(msg: string, data?: unknown) {
  const state = getAIIntegrationState();
  if (state.advancedSettings.debugMode) {
    console.log(`${DEBUG} ${msg}`, data ?? '');
  } else {
    console.log(`${DEBUG} ${msg}`);
  }
}

// ─── Resolve active providers for a feature ──────────────────────────
function resolveChain(feature: AIFeature, state: AIIntegrationState): AIProvider[] {
  const chain: AIProvider[] = [];

  // Build fallback chain based on feature type
  let globalChain: AIProvider[];
  if (feature === 'chat' || feature === 'inspire' || feature === 'prompt_enhance') {
    globalChain = [state.globalDefaults.chatDefault, ...state.globalDefaults.generationFallback];
  } else if (feature === 'image_edit' || feature === 'image_to_image') {
    globalChain = state.globalDefaults.editingFallback;
  } else {
    globalChain = state.globalDefaults.generationFallback;
  }

  // Add from global chain if provider is enabled and supports the feature
  for (const p of globalChain) {
    if (p === 'onspace') continue; // Never include onspace in external chain
    const config = state.providers[p];
    if (!config) continue;
    if (!config.settings.enabled) continue;
    if (!config.auth.apiKey && p !== 'comfyui') continue; // Skip unconfigured providers
    const caps = config.capabilities as Record<string, boolean>;
    if (!caps[feature]) continue;
    if (!chain.includes(p)) chain.push(p);
  }

  // Add any remaining enabled/configured providers not already in chain
  for (const [pid, config] of Object.entries(state.providers) as [AIProvider, typeof state.providers[AIProvider]][]) {
    if (pid === 'onspace') continue;
    if (!config.settings.enabled) continue;
    if (!config.auth.apiKey && pid !== 'comfyui') continue;
    const caps = config.capabilities as Record<string, boolean>;
    if (!caps[feature]) continue;
    if (!chain.includes(pid)) chain.push(pid);
  }

  debugLog(`Resolved chain for [${feature}]:`, chain);
  return chain;
}

function isRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('timeout') || msg.includes('429') || msg.includes('rate limit') ||
    msg.includes('503') || msg.includes('502') || msg.includes('504') || msg.includes('network');
}

function isNonRetryable(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return msg.includes('invalid api key') || msg.includes('401') ||
    msg.includes('invalid key') || msg.includes('no image');
}

// ─── Try Ollama compute provider first (if mode = local/ollama_cloud) ──
async function tryOllamaProvider(
  feature: AIFeature,
  prompt: string,
  imageBase64?: string,
): Promise<{ imageUrl?: string; text?: string } | null> {
  const compute = getComputeProviderState();
  if (compute.mode === 'cloud') return null; // Skip Ollama if cloud mode

  const ollamaConfig = {
    baseUrl: compute.mode === 'ollama_cloud' ? compute.localUrl : compute.localUrl,
    apiKey: compute.mode === 'ollama_cloud' ? compute.cloudApiKey : undefined,
    model: compute.mode === 'ollama_cloud' ? compute.cloudModel : compute.localModel,
    isCloud: compute.mode === 'ollama_cloud',
  };

  try {
    if (feature === 'text_to_image' || feature === 'image_edit') {
      const text = await ollamaGenerateWithImage(ollamaConfig, prompt, imageBase64);
      return { text };
    } else if (feature === 'chat' || feature === 'inspire') {
      const text = await ollamaChat(ollamaConfig, [{ role: 'user', content: prompt }]);
      return { text };
    }
  } catch (err) {
    debugLog('Ollama provider failed (gracefully):', err instanceof Error ? err.message : err);
  }
  return null;
}

// ─── Main external provider router ───────────────────────────────────
export async function routeToExternalProvider(
  feature: AIFeature,
  callClient: (provider: AIProvider, state: AIIntegrationState) => Promise<AIRouteResponse>
): Promise<AIRouteResponse | null> {
  const state = getAIIntegrationState();
  const chain = resolveChain(feature, state);
  const maxAttempts = state.advancedSettings.maxFallbackAttempts;

  if (chain.length === 0) {
    debugLog('No external providers configured for feature:', feature);
    return null;
  }

  let lastError: unknown;
  for (const provider of chain.slice(0, maxAttempts)) {
    debugLog(`Trying provider [${provider}] for feature [${feature}]`);
    try {
      const result = await callClient(provider, state);
      debugLog(`Success with provider [${provider}]`, { model: result.model });
      return result;
    } catch (err) {
      lastError = err;
      debugLog(`Provider [${provider}] failed:`, err instanceof Error ? err.message : err);
      if (isNonRetryable(err)) {
        debugLog(`Non-retryable error from [${provider}], stopping fallback`);
        break;
      }
      if (!isRetryable(err)) break;
    }
  }

  debugLog('All external providers failed. Last error:', lastError instanceof Error ? lastError.message : lastError);
  return null;
}

// ─── Text-to-Image ────────────────────────────────────────────────────
export async function generateImageViaProvider(
  prompt: string,
  aspectRatio = '1:1',
  style = '',
): Promise<{ imageUrl: string; provider: AIProvider } | null> {
  // Try Ollama first if local/cloud mode is active
  const ollamaResult = await tryOllamaProvider('text_to_image', prompt);
  if (ollamaResult?.text) {
    // Ollama llava returns text description, not a real image URL — use a placeholder
    // In a real setup with a local diffusion model, this would return an image
    debugLog('Ollama returned response for text_to_image (multimodal description)');
    // Fall through to external providers for actual image generation
  }

  const result = await routeToExternalProvider('text_to_image', async (provider, state) => {
    const config = state.providers[provider];
    const client = providerClientFactory(provider, config);
    if (!client.generateTextToImage) throw new Error(`${provider} has no T2I implementation`);
    return client.generateTextToImage({ feature: 'text_to_image', prompt, aspectRatio, stylePreset: style });
  });

  if (result?.imageUrl) {
    return { imageUrl: result.imageUrl, provider: result.provider };
  }
  return null;
}

// ─── Image Edit ───────────────────────────────────────────────────────
export async function editImageViaProvider(
  prompt: string,
  imageBase64: string,
): Promise<{ imageUrl: string; provider: AIProvider } | null> {
  const result = await routeToExternalProvider('image_edit', async (provider, state) => {
    const config = state.providers[provider];
    const client = providerClientFactory(provider, config);
    if (!client.generateImageEdit) throw new Error(`${provider} has no image_edit implementation`);
    return client.generateImageEdit({ feature: 'image_edit', prompt, image: imageBase64 });
  });

  if (result?.imageUrl) {
    return { imageUrl: result.imageUrl, provider: result.provider };
  }
  return null;
}

// ─── Chat (for Avni AI assistant) ────────────────────────────────────
export async function chatViaProvider(
  messages: { role: string; content: string }[],
  systemPrompt: string,
): Promise<{ text: string; provider: AIProvider } | null> {
  const state = getAIIntegrationState();

  // Try Ollama first if in local/cloud mode
  const lastUserMsg = messages.filter(m => m.role === 'user').pop()?.content ?? '';
  const fullPrompt = `${systemPrompt}\n\nUser: ${lastUserMsg}`;
  const ollamaResult = await tryOllamaProvider('chat', fullPrompt);
  if (ollamaResult?.text) {
    return { text: ollamaResult.text, provider: 'comfyui' as AIProvider }; // using comfyui slot as "ollama"
  }

  // Build full prompt from messages + system context
  const contextPrompt = `${systemPrompt}\n\nConversation context:\n${messages.slice(-4).map(m => `${m.role}: ${m.content}`).join('\n')}\n\nUser: ${lastUserMsg}`;

  const result = await routeToExternalProvider('chat', async (provider, st) => {
    const config = st.providers[provider];
    const client = providerClientFactory(provider, config);
    if (!client.chat) throw new Error(`${provider} has no chat implementation`);
    return client.chat({ feature: 'chat', prompt: contextPrompt });
  });

  if (result?.text) {
    return { text: result.text, provider: result.provider };
  }
  return null;
}

// ─── Inspire prompts ──────────────────────────────────────────────────
export async function getInspirePromptsViaProvider(
  partialPrompt: string,
): Promise<{ prompts: string[]; theme: string; provider: AIProvider } | null> {
  const themes = ['cosmic/space', 'fantasy/magical', 'cyberpunk/neon', 'nature/landscape', 'surrealist/dreamlike'];
  const theme = themes[Math.floor(Math.random() * themes.length)];
  const userMsg = partialPrompt.trim()
    ? `Generate 4 creative image prompts expanding on: "${partialPrompt}". Make each visually distinct.`
    : `Generate 4 creative image prompts with "${theme}" theme. Make each unique and detailed.`;

  const systemMsg = `You are an AI art prompt generator. Generate exactly 4 short vivid image prompts. Output ONLY a JSON array of 4 strings, no explanation. Example: ["prompt1","prompt2","prompt3","prompt4"]`;

  const result = await routeToExternalProvider('inspire', async (provider, state) => {
    const config = state.providers[provider];
    const client = providerClientFactory(provider, config);
    if (!client.chat) throw new Error(`${provider} has no chat implementation`);
    return client.chat({ feature: 'inspire', prompt: `${systemMsg}\n\n${userMsg}` });
  });

  if (result?.text) {
    try {
      const match = result.text.match(/\[[\s\S]*?\]/);
      const prompts: string[] = match ? JSON.parse(match[0]) : [];
      if (prompts.length > 0) {
        return { prompts, theme, provider: result.provider };
      }
    } catch {
      // fallback: try to split by newlines
      const lines = result.text.split('\n').filter(l => l.trim().length > 10).slice(0, 4);
      if (lines.length > 0) return { prompts: lines, theme, provider: result.provider };
    }
  }
  return null;
}

// ─── Check if any external provider is configured ────────────────────
export function hasConfiguredExternalProvider(feature: AIFeature): boolean {
  const state = getAIIntegrationState();
  const chain = resolveChain(feature, state);
  return chain.length > 0;
}

// ─── Get display name of active provider for feature ─────────────────
export function getActiveProviderLabel(feature: AIFeature): string {
  const state = getAIIntegrationState();
  const chain = resolveChain(feature, state);
  if (chain.length === 0) return state.onspaceAsFallback ? 'OnSpace AI' : 'No provider';
  const first = chain[0];
  return state.providers[first]?.label ?? first;
}

export async function generateGeminiImage(prompt: string) {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ['IMAGE'] }
      })
    }
  );

  const data = await response.json();
  // Extract the base64 image data string
  const base64Image = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  return `data:image/png;base64,${base64Image}`;
}
