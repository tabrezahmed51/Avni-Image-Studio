import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabaseClient';
import {
  generateImageViaProvider,
  editImageViaProvider,
  getInspirePromptsViaProvider,
  hasConfiguredExternalProvider,
} from '@/lib/providerApi';
import { getAIIntegrationState } from '@/features/ai-integrations/store/aiIntegrationStore';

// Re-export supabase for backward-compat
export { supabase } from '@/lib/supabaseClient';

// ─── Edge function invoker (OnSpace backend) ──────────────────────────
async function invokeFunction(name: string, body: object) {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let errorMessage = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const statusCode = error.context?.status ?? 500;
        const textContent = await error.context?.text();
        if (textContent) {
          try {
            const parsed = JSON.parse(textContent);
            errorMessage = parsed.error || parsed.message || textContent;
          } catch {
            errorMessage = textContent;
          }
        }
        errorMessage = `[Code: ${statusCode}] ${errorMessage}`;
      } catch {
        errorMessage = `${error.message || 'Failed to read response'}`;
      }
    }
    throw new Error(errorMessage);
  }
  // Check for HTTP 200 payloads that contain error properties
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(String(data.error));
  }
  return data;
}

// ─── Generate Image ───────────────────────────────────────────────────
export async function generateImage(
  prompt: string,
  aspectRatio = '1:1',
  style = '',
  imageBase64: string | null = null
): Promise<{ imageUrl: string; prompt: string; provider?: string }> {
  const state = getAIIntegrationState();
  const isEdit = Boolean(imageBase64);
  const feature = isEdit ? 'image_edit' : 'text_to_image';

  console.log(`[api] generateImage | mode=${isEdit ? 'edit' : 'generate'} | prompt="${prompt.slice(0, 60)}" | onspaceAsFallback=${state.onspaceAsFallback}`);

  // 1. Try external providers first
  if (hasConfiguredExternalProvider(feature)) {
    console.log(`[api] Routing to external provider for [${feature}]`);
    try {
      let result: { imageUrl: string; provider: import('@/features/ai-integrations/types/aiIntegration.types').AIProvider } | null = null;
      if (isEdit && imageBase64) {
        result = await editImageViaProvider(prompt, imageBase64);
      } else {
        result = await generateImageViaProvider(prompt, aspectRatio, style);
      }
      if (result) {
        console.log(`[api] External provider success: ${result.provider}`);
        return { imageUrl: result.imageUrl, prompt, provider: result.provider };
      }
    } catch (err) {
      console.warn('[api] External provider failed:', err instanceof Error ? err.message : err);
    }
  }

  // 2. OnSpace AI fallback (only if user has opted in)
  if (state.onspaceAsFallback) {
    console.log('[api] Falling back to OnSpace AI backend');
    const result = await invokeFunction('generate-image', { prompt, aspectRatio, style, imageBase64 });
    return { ...result, provider: 'onspace' };
  }

  // 3. No configured provider and OnSpace fallback disabled
  if (!hasConfiguredExternalProvider(feature)) {
    throw new Error(
      'No AI provider configured. Go to Settings (⚙) → AI Integrations to add your Gemini, OpenRouter, or OpenAI API key. Or enable "Use OnSpace AI as fallback" in Advanced settings.'
    );
  }

  throw new Error('Image generation failed. All configured providers returned errors. Check Settings → AI Integrations.');
}

// ─── Inspire Prompts ──────────────────────────────────────────────────
export async function getInspirePrompts(
  partialPrompt = ''
): Promise<{ prompts: string[]; theme: string }> {
  const state = getAIIntegrationState();
  console.log('[api] getInspirePrompts | onspaceAsFallback:', state.onspaceAsFallback);

  // 1. Try external providers
  if (hasConfiguredExternalProvider('inspire')) {
    console.log('[api] Routing inspire to external provider');
    try {
      const result = await getInspirePromptsViaProvider(partialPrompt);
      if (result) {
        console.log(`[api] Inspire success via: ${result.provider}`);
        return { prompts: result.prompts, theme: result.theme };
      }
    } catch (err) {
      console.warn('[api] External inspire failed:', err instanceof Error ? err.message : err);
    }
  }

  // 2. OnSpace fallback
  if (state.onspaceAsFallback) {
    return invokeFunction('inspire-prompts', { partialPrompt });
  }

  // 3. No provider
  if (!hasConfiguredExternalProvider('inspire')) {
    throw new Error('No AI provider configured for Inspire Me. Go to Settings → AI Integrations.');
  }

  throw new Error('Inspire prompts failed. Check Settings → AI Integrations.');
}

// ─── Avni AI Chat (for edge function path only — see AvniAIChat.tsx for provider path) ──
export async function callAvniChatOnSpace(
  messages: { role: string; content: string }[],
  currentPrompt: string
): Promise<{ message: string; action: unknown }> {
  return invokeFunction('avni-ai-chat', { messages, currentPrompt });
}

// ─── Utils ────────────────────────────────────────────────────────────
export function convertImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(reader.error?.message || 'File reading failed'));
    reader.readAsDataURL(file);
  });
}

export async function downloadAllImagesAsZip(
  images: { url: string; filename: string }[],
  onProgress?: (packed: number, total: number) => void
): Promise<void> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const folder = zip.folder('avni-studio-gallery')!;
  let packed = 0;
  const total = images.length;
  
  const usedFilenames = new Set<string>();

  for (const { url, filename } of images) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      
      // Deduplicate filename
      let uniqueName = filename;
      const dotIndex = filename.lastIndexOf('.');
      const baseName = dotIndex !== -1 ? filename.slice(0, dotIndex) : filename;
      const ext = dotIndex !== -1 ? filename.slice(dotIndex) : '';
      let counter = 1;
      while (usedFilenames.has(uniqueName)) {
        uniqueName = `${baseName}_${counter}${ext}`;
        counter++;
      }
      usedFilenames.add(uniqueName);

      folder.file(uniqueName, blob);
    } catch (err) {
      console.warn(`Skipped ${filename} due to error:`, err);
    } finally {
      packed++;
      onProgress?.(packed, total);
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'avni-studio-gallery.zip';
  a.click();
  URL.revokeObjectURL(a.href);
}
