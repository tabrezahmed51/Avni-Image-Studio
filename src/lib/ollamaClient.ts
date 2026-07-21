/**
 * Ollama Client — supports both local self-hosted Ollama and Ollama Cloud.
 * 
 * Local: http://localhost:11434
 * Cloud: https://api.ollama.com (with API key)
 */

export interface OllamaConfig {
  baseUrl: string;       // e.g. http://localhost:11434 or https://api.ollama.com
  apiKey?: string;       // Required for cloud, optional for local
  model?: string;        // e.g. llava, llama3, mistral
  isCloud?: boolean;
}

export interface OllamaMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  images?: string[];     // base64 image data for multimodal models
}

function buildHeaders(config: OllamaConfig): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' };
  if (config.apiKey) h['Authorization'] = `Bearer ${config.apiKey}`;
  return h;
}

// ── Test connection ────────────────────────────────────────────────────
export async function testOllamaConnection(config: OllamaConfig): Promise<{ ok: boolean; error?: string; models?: string[] }> {
  if (!config.baseUrl) return { ok: false, error: 'Ollama URL is required' };
  try {
    // Local Ollama uses /api/tags, Cloud uses /api/models
    const endpoint = config.isCloud
      ? `${config.baseUrl}/api/models`
      : `${config.baseUrl}/api/tags`;

    const res = await fetch(endpoint, {
      headers: buildHeaders(config),
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 401) return { ok: false, error: 'Invalid API key' };
    if (!res.ok) return { ok: false, error: `HTTP ${res.status} — is Ollama running at ${config.baseUrl}?` };

    const data = await res.json();
    const models: string[] = (data.models ?? data.items ?? []).map((m: { name?: string; model?: string }) => m.name || m.model || '').filter(Boolean);
    return { ok: true, models };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes('timeout') || msg.includes('abort')) return { ok: false, error: 'Connection timed out — check if Ollama is running' };
    if (msg.includes('CORS') || msg.includes('Failed to fetch')) return { ok: false, error: 'Cannot reach Ollama — check URL and CORS settings (run with OLLAMA_ORIGINS=*)' };
    return { ok: false, error: msg };
  }
}

// ── Chat (non-streaming) ───────────────────────────────────────────────
export async function ollamaChat(
  config: OllamaConfig,
  messages: OllamaMessage[],
  onChunk?: (text: string) => void
): Promise<string> {
  const model = config.model || 'llama3.2';
  const url = `${config.baseUrl}/api/chat`;

  const stream = Boolean(onChunk);
  const res = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(config),
    body: JSON.stringify({
      model,
      messages,
      stream,
    }),
    signal: AbortSignal.timeout(120000),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => `HTTP ${res.status}`);
    throw new Error(`Ollama chat error: ${errText}`);
  }

  if (stream && res.body) {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      for (const line of chunk.split('\n').filter(Boolean)) {
        try {
          const obj = JSON.parse(line);
          const token = obj.message?.content ?? '';
          if (token) { full += token; onChunk?.(token); }
        } catch { /* skip */ }
      }
    }
    return full;
  }

  const data = await res.json();
  return data.message?.content ?? '';
}

// ── Generate image via multimodal model (e.g. llava) ──────────────────
export async function ollamaGenerateWithImage(
  config: OllamaConfig,
  prompt: string,
  imageBase64?: string,
): Promise<string> {
  const model = config.model || 'llava';
  const messages: OllamaMessage[] = [
    {
      role: 'user',
      content: prompt,
      ...(imageBase64 ? { images: [imageBase64.replace(/^data:image\/\w+;base64,/, '')] } : {}),
    },
  ];
  return ollamaChat(config, messages);
}

// ── List local models ─────────────────────────────────────────────────
export async function listOllamaModels(config: OllamaConfig): Promise<string[]> {
  const result = await testOllamaConnection(config);
  return result.models ?? [];
}
