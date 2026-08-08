/**
 * providerClientFactory.ts
 * Builds real, working API clients for each external provider.
 * All requests go directly from the browser to the external API.
 */

import type {
  AIProvider, ProviderConfig, ProviderClient,
  AIRouteRequest, AIRouteResponse, ModelOption,
} from '../types/aiIntegration.types';

const DEBUG_PREFIX = '[ProviderClient]';

function log(provider: string, ...args: unknown[]) {
  console.log(`${DEBUG_PREFIX} [${provider}]`, ...args);
}

// ─── Gemini Client ────────────────────────────────────────────────────
function createGeminiClient(config: ProviderConfig): ProviderClient {
  const apiKey = config.auth.apiKey || import.meta.env.VITE_GEMINI_API_KEY || '';
  const base = 'https://generativelanguage.googleapis.com';

  return {
    async testConnection() {
      if (!apiKey) return { ok: false, error: 'API key is required. Get yours at https://aistudio.google.com/apikey' };
      if (!apiKey.startsWith('AIza')) {
        return { ok: false, error: 'Invalid Gemini key format — should start with "AIza"' };
      }
      // Gemini uses ?key= query param NOT Bearer header
      const url = `${base}/v1beta/models?key=${apiKey}`;
      log('gemini', 'Testing connection:', url.replace(apiKey, 'AIza***'));
      try {
        const res = await fetch(url, {
          signal: AbortSignal.timeout(10000),
        });
        const body = await res.json().catch(() => ({}));
        log('gemini', 'Test response status:', res.status, JSON.stringify(body).slice(0, 200));
        if (res.status === 400 && body?.error?.message?.includes('API_KEY_INVALID')) {
          return { ok: false, error: 'API key is invalid — check it in Google AI Studio' };
        }
        if (res.status === 401 || res.status === 403) {
          return { ok: false, error: `Auth failed (${res.status}) — verify key permissions` };
        }
        if (res.status === 429) return { ok: false, error: 'Rate limited (429) — try again later' };
        if (res.ok) return { ok: true };
        return { ok: false, error: body?.error?.message ?? `HTTP ${res.status}` };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error';
        if (msg.includes('abort') || msg.includes('timeout')) return { ok: false, error: 'Connection timed out' };
        return { ok: false, error: msg };
      }
    },

    async chat(req: AIRouteRequest): Promise<AIRouteResponse> {
      const model = config.settings.preferredModelByFeature['chat'] ?? 'gemini-3-flash-preview';
      const url = `${base}/v1beta/models/${model}:generateContent?key=${apiKey}`;
      log('gemini', 'Chat request to model:', model);
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: req.prompt }] }],
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Gemini chat error: ${err?.error?.message ?? res.status}`);
      }
      const data = await res.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      return { provider: 'gemini', model, output: text, text, usedFallback: false };
    },

    async generateTextToImage(req: AIRouteRequest): Promise<AIRouteResponse> {
      const model = config.settings.preferredModelByFeature['text_to_image'] ?? 'gemini-2.5-flash-image';
      const fullPrompt = req.stylePreset ? `${req.prompt}, ${req.stylePreset}` : (req.prompt ?? '');
      const url = `${base}/v1beta/models/${model}:generateContent?key=${apiKey}`;
      log('gemini', 'T2I request model:', model, 'prompt:', fullPrompt.slice(0, 80));

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Generate a high-quality image: ${fullPrompt}` }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Gemini T2I error: ${err?.error?.message ?? res.status}`);
      }
      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData);
      if (!imagePart) throw new Error('Gemini returned no image');
      const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
      return { provider: 'gemini', model, output: imageUrl, imageUrl, usedFallback: false };
    },

    async generateImageEdit(req: AIRouteRequest): Promise<AIRouteResponse> {
      const model = config.settings.preferredModelByFeature['image_edit'] ?? 'gemini-2.5-flash-image';
      const url = `${base}/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const imageData = req.image as string;
      const mimeType = imageData.match(/data:(image\/\w+);/)?.[1] ?? 'image/png';
      const base64 = imageData.replace(/^data:image\/\w+;base64,/, '');
      log('gemini', 'ImageEdit request model:', model);

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { inlineData: { mimeType, data: base64 } },
              { text: `Edit this image: ${req.prompt}. Preserve the composition.` },
            ],
          }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`Gemini image edit error: ${err?.error?.message ?? res.status}`);
      }
      const data = await res.json();
      const parts = data.candidates?.[0]?.content?.parts ?? [];
      const imagePart = parts.find((p: { inlineData?: { mimeType: string; data: string } }) => p.inlineData);
      if (!imagePart) throw new Error('Gemini returned no edited image');
      const imageUrl = `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
      return { provider: 'gemini', model, output: imageUrl, imageUrl, usedFallback: false };
    },
  };
}

// ─── OpenRouter Client ────────────────────────────────────────────────
function createOpenRouterClient(config: ProviderConfig): ProviderClient {
  const apiKey = config.auth.apiKey ?? '';
  const base = config.endpoints.baseUrl ?? 'https://openrouter.ai/api/v1';

  const headers = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    'HTTP-Referer': window.location.origin,
    'X-Title': 'Avni Image Studio',
  });

  return {
    async testConnection() {
      if (!apiKey) return { ok: false, error: 'API key required. Get one at https://openrouter.ai/keys' };
      if (!apiKey.startsWith('sk-or-')) {
        return { ok: false, error: 'OpenRouter keys should start with "sk-or-"' };
      }
      log('openrouter', 'Testing connection...');
      try {
        const res = await fetch(`${base}/models`, {
          headers: headers(),
          signal: AbortSignal.timeout(10000),
        });
        if (res.status === 401) return { ok: false, error: 'Invalid API key (401)' };
        if (res.status === 403) return { ok: false, error: 'Forbidden — check key permissions (403)' };
        if (res.ok) { log('openrouter', 'Connected ✓'); return { ok: true }; }
        return { ok: false, error: `HTTP ${res.status}` };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Connection failed' };
      }
    },

    async chat(req: AIRouteRequest): Promise<AIRouteResponse> {
      const model = config.settings.preferredModelByFeature['chat'] ?? 'google/gemini-3-flash-preview';
      log('openrouter', 'Chat model:', model);
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: req.prompt }],
        }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`OpenRouter chat error: ${err?.error?.message ?? res.status}`);
      }
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content ?? '';
      return { provider: 'openrouter', model, output: text, text, usedFallback: false };
    },

    async generateTextToImage(req: AIRouteRequest): Promise<AIRouteResponse> {
      const model = config.settings.preferredModelByFeature['text_to_image'] ?? 'google/gemini-2.5-flash-image';
      const fullPrompt = req.stylePreset ? `${req.prompt}, ${req.stylePreset}` : (req.prompt ?? '');
      log('openrouter', 'T2I model:', model, 'prompt:', fullPrompt.slice(0, 80));
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: [{ type: 'text', text: `Generate a stunning image: ${fullPrompt}` }] }],
          modalities: ['image', 'text'],
          image_config: { aspect_ratio: req.aspectRatio ?? '1:1', image_size: '1K' },
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`OpenRouter T2I error: ${err?.error?.message ?? res.status}`);
      }
      const data = await res.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageUrl) throw new Error('OpenRouter returned no image');
      return { provider: 'openrouter', model, output: imageUrl, imageUrl, usedFallback: false };
    },

    async generateImageEdit(req: AIRouteRequest): Promise<AIRouteResponse> {
      const model = config.settings.preferredModelByFeature['image_edit'] ?? 'google/gemini-2.5-flash-image';
      log('openrouter', 'ImageEdit model:', model);
      const contentParts: object[] = [];
      if (req.image) contentParts.push({ type: 'image_url', image_url: { url: req.image } });
      contentParts.push({ type: 'text', text: `Edit this image: ${req.prompt}` });
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: contentParts }],
          modalities: ['image', 'text'],
          image_config: { aspect_ratio: '1:1', image_size: '1K' },
        }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`OpenRouter image edit error: ${err?.error?.message ?? res.status}`);
      }
      const data = await res.json();
      const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      if (!imageUrl) throw new Error('OpenRouter returned no edited image');
      return { provider: 'openrouter', model, output: imageUrl, imageUrl, usedFallback: false };
    },
  };
}

// ─── OpenAI Client ────────────────────────────────────────────────────
function createOpenAIClient(config: ProviderConfig): ProviderClient {
  const apiKey = config.auth.apiKey ?? '';
  const base = config.endpoints.baseUrl ?? 'https://api.openai.com/v1';
  const headers = () => ({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
    ...(config.auth.organizationId ? { 'OpenAI-Organization': config.auth.organizationId } : {}),
  });

  return {
    async testConnection() {
      if (!apiKey) return { ok: false, error: 'API key required. Get one at https://platform.openai.com/api-keys' };
      if (!apiKey.startsWith('sk-')) return { ok: false, error: 'OpenAI keys should start with "sk-"' };
      log('openai', 'Testing connection...');
      try {
        const res = await fetch(`${base}/models`, { headers: headers(), signal: AbortSignal.timeout(10000) });
        if (res.status === 401) return { ok: false, error: 'Invalid API key (401)' };
        if (res.status === 429) return { ok: false, error: 'Rate limited (429)' };
        if (res.ok) return { ok: true };
        return { ok: false, error: `HTTP ${res.status}` };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Connection failed' };
      }
    },

    async chat(req: AIRouteRequest): Promise<AIRouteResponse> {
      const model = config.settings.preferredModelByFeature['chat'] ?? 'gpt-4o-mini';
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ model, messages: [{ role: 'user', content: req.prompt }] }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`OpenAI chat error: ${err?.error?.message ?? res.status}`);
      }
      const data = await res.json();
      const text = data.choices?.[0]?.message?.content ?? '';
      return { provider: 'openai', model, output: text, text, usedFallback: false };
    },

    async generateTextToImage(req: AIRouteRequest): Promise<AIRouteResponse> {
      const model = config.settings.preferredModelByFeature['text_to_image'] ?? 'dall-e-3';
      const fullPrompt = req.stylePreset ? `${req.prompt}, ${req.stylePreset}` : (req.prompt ?? '');
      log('openai', 'T2I model:', model);
      const [w, h] = (() => {
        const ar = req.aspectRatio ?? '1:1';
        if (ar === '16:9') return [1792, 1024];
        if (ar === '9:16') return [1024, 1792];
        return [1024, 1024];
      })();
      const res = await fetch(`${base}/images/generations`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ model, prompt: fullPrompt, n: 1, size: `${w}x${h}`, response_format: 'url' }),
        signal: AbortSignal.timeout(60000),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(`OpenAI DALL·E error: ${err?.error?.message ?? res.status}`);
      }
      const data = await res.json();
      const imageUrl = data.data?.[0]?.url;
      if (!imageUrl) throw new Error('OpenAI returned no image');
      return { provider: 'openai', model, output: imageUrl, imageUrl, usedFallback: false };
    },
  };
}

// ─── Grok Client ──────────────────────────────────────────────────────
function createGrokClient(config: ProviderConfig): ProviderClient {
  const apiKey = config.auth.apiKey ?? '';
  const base = config.endpoints.baseUrl ?? 'https://api.x.ai/v1';
  const headers = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` });

  return {
    async testConnection() {
      if (!apiKey) return { ok: false, error: 'API key required. Get one at https://console.x.ai' };
      log('grok', 'Testing connection...');
      try {
        const res = await fetch(`${base}/models`, { headers: headers(), signal: AbortSignal.timeout(10000) });
        if (res.status === 401) return { ok: false, error: 'Invalid API key (401)' };
        if (res.ok) return { ok: true };
        return { ok: false, error: `HTTP ${res.status}` };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Connection failed' };
      }
    },
    async chat(req: AIRouteRequest): Promise<AIRouteResponse> {
      const model = config.settings.preferredModelByFeature['chat'] ?? 'grok-2-1212';
      const res = await fetch(`${base}/chat/completions`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ model, messages: [{ role: 'user', content: req.prompt }] }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(`Grok: ${e?.error?.message ?? res.status}`); }
      const data = await res.json();
      return { provider: 'grok', model, output: data.choices?.[0]?.message?.content ?? '', text: data.choices?.[0]?.message?.content ?? '', usedFallback: false };
    },
  };
}

// ─── Qwen Client ──────────────────────────────────────────────────────
function createQwenClient(config: ProviderConfig): ProviderClient {
  const apiKey = config.auth.apiKey ?? '';
  const base = 'https://dashscope.aliyuncs.com/api/v1';
  const headers = () => ({ 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` });

  return {
    async testConnection() {
      if (!apiKey) return { ok: false, error: 'API key required. Get one at https://dashscope.aliyuncs.com' };
      // Qwen doesn't have an open /models endpoint — try a lightweight chat
      log('qwen', 'Testing connection via lightweight request...');
      try {
        const res = await fetch(`${base}/services/aigc/text-generation/generation`, {
          method: 'POST',
          headers: headers(),
          body: JSON.stringify({
            model: 'qwen-turbo',
            input: { messages: [{ role: 'user', content: 'hi' }] },
            parameters: { max_tokens: 1 },
          }),
          signal: AbortSignal.timeout(10000),
        });
        if (res.status === 401) return { ok: false, error: 'Invalid API key (401)' };
        if (res.status === 403) return { ok: false, error: 'Forbidden (403) — check key permissions' };
        if (res.ok || res.status === 400) return { ok: true }; // 400 can mean valid key but bad model
        return { ok: false, error: `HTTP ${res.status}` };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Connection failed' };
      }
    },
    async chat(req: AIRouteRequest): Promise<AIRouteResponse> {
      const model = config.settings.preferredModelByFeature['chat'] ?? 'qwen-turbo';
      const res = await fetch(`${base}/services/aigc/text-generation/generation`, {
        method: 'POST', headers: headers(),
        body: JSON.stringify({ model, input: { messages: [{ role: 'user', content: req.prompt }] } }),
        signal: AbortSignal.timeout(30000),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(`Qwen: ${e?.message ?? res.status}`); }
      const data = await res.json();
      const text = data.output?.text ?? data.output?.choices?.[0]?.message?.content ?? '';
      return { provider: 'qwen', model, output: text, text, usedFallback: false };
    },
  };
}

// ─── Hugging Face Client ──────────────────────────────────────────────
function createHuggingFaceClient(config: ProviderConfig): ProviderClient {
  const apiKey = config.auth.apiKey ?? '';
  const endpoint = config.endpoints.baseUrl ?? '';

  return {
    async testConnection() {
      if (!apiKey) return { ok: false, error: 'API key required. Get one at https://huggingface.co/settings/tokens' };
      if (!endpoint) return { ok: false, error: 'Inference endpoint URL is required' };
      log('huggingface', 'Testing endpoint:', endpoint);
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ inputs: 'test' }),
          signal: AbortSignal.timeout(15000),
        });
        if (res.status === 401) return { ok: false, error: 'Invalid HuggingFace token (401)' };
        if (res.status === 403) return { ok: false, error: 'Forbidden — check token permissions (403)' };
        if (res.ok || res.status === 503) return { ok: true }; // 503 means model loading
        return { ok: false, error: `HTTP ${res.status}` };
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : 'Cannot reach endpoint' };
      }
    },
    async generateTextToImage(req: AIRouteRequest): Promise<AIRouteResponse> {
      if (!endpoint) throw new Error('HuggingFace: endpoint URL not configured');
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: req.prompt }),
        signal: AbortSignal.timeout(90000),
      });
      if (!res.ok) throw new Error(`HuggingFace error: HTTP ${res.status}`);
      const blob = await res.blob();
      const imageUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
      return { provider: 'huggingface', model: 'custom', output: imageUrl, imageUrl, usedFallback: false };
    },
  };
}

// ─── ComfyUI Client ───────────────────────────────────────────────────
function createComfyUIClient(config: ProviderConfig): ProviderClient {
  const base = config.endpoints.baseUrl ?? '';

  return {
    async testConnection() {
      if (!base) return { ok: false, error: 'ComfyUI base URL is required (e.g. http://localhost:8188)' };
      const healthPath = config.endpoints.healthPath ?? '/system_stats';
      log('comfyui', 'Testing:', `${base}${healthPath}`);
      try {
        const res = await fetch(`${base}${healthPath}`, { signal: AbortSignal.timeout(5000) });
        if (res.ok) return { ok: true };
        return { ok: false, error: `HTTP ${res.status} — is ComfyUI running at ${base}?` };
      } catch {
        return { ok: false, error: `Cannot reach ComfyUI at ${base} — check URL and that server is running` };
      }
    },
    async generateTextToImage(): Promise<AIRouteResponse> {
      return { provider: 'comfyui', model: 'workflow_t2i', output: null, usedFallback: false };
    },
  };
}

// ─── Factory entry point ──────────────────────────────────────────────
export function providerClientFactory(provider: AIProvider, config: ProviderConfig): ProviderClient {
  log(provider, 'Creating client...');
  switch (provider) {
    case 'gemini': return createGeminiClient(config);
    case 'openrouter': return createOpenRouterClient(config);
    case 'openai': return createOpenAIClient(config);
    case 'grok': return createGrokClient(config);
    case 'qwen': return createQwenClient(config);
    case 'huggingface': return createHuggingFaceClient(config);
    case 'comfyui': return createComfyUIClient(config);
    default: {
      // Generic fallback
      return {
        async testConnection() { return { ok: false, error: `No client implementation for provider: ${provider}` }; },
      };
    }
  }
}
