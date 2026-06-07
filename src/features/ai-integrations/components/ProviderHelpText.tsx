import type { AIProvider } from '../types/aiIntegration.types';
import { PROVIDER_DESCRIPTIONS } from '../services/providerRegistry';

const DOCS_LINKS: Partial<Record<AIProvider, string>> = {
  openrouter: 'https://openrouter.ai/keys',
  openai: 'https://platform.openai.com/api-keys',
  gemini: 'https://aistudio.google.com/apikey',
  huggingface: 'https://huggingface.co/settings/tokens',
  grok: 'https://console.x.ai',
  qwen: 'https://dashscope.console.aliyun.com/apiKey',
  comfyui: 'https://github.com/comfyanonymous/ComfyUI',
};

const PROVIDER_NOTES: Partial<Record<AIProvider, string>> = {
  gemini: 'Key must start with "AIza". Get it from Google AI Studio (not Google Cloud Console). Used via query param — no bearer header needed.',
  openrouter: 'Key must start with "sk-or-". Add credits at openrouter.ai/credits for image generation.',
  openai: 'Key starts with "sk-". Image generation uses DALL·E 3 by default.',
  huggingface: 'Use your access token AND set the Inference Endpoint URL below.',
  grok: 'xAI API key. Image generation support may require grok-2-image model.',
  comfyui: 'Self-hosted only. Enter your local/remote ComfyUI URL (e.g. http://localhost:8188).',
  qwen: 'DashScope API key from Aliyun console. Image editing uses Qwen-VL-Max model.',
};

interface ProviderHelpTextProps {
  provider: AIProvider;
}

export default function ProviderHelpText({ provider }: ProviderHelpTextProps) {
  const desc = PROVIDER_DESCRIPTIONS[provider];
  const link = DOCS_LINKS[provider];
  const note = PROVIDER_NOTES[provider];

  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-secondary/40 border border-border/30">
      <span className="text-base mt-0.5">ℹ️</span>
      <div className="space-y-1">
        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
        {note && (
          <p className="text-[11px] text-amber-300/80 leading-relaxed">{note}</p>
        )}
        {link && (
          <a
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline mt-0.5 inline-block"
          >
            Get API key →
          </a>
        )}
      </div>
    </div>
  );
}
