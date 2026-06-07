import type { AIProvider } from '../types/aiIntegration.types';
import { PROVIDER_DESCRIPTIONS } from '../services/providerRegistry';

const DOCS_LINKS: Partial<Record<AIProvider, string>> = {
  openrouter: 'https://openrouter.ai/keys',
  openai: 'https://platform.openai.com/api-keys',
  gemini: 'https://aistudio.google.com/app/apikey',
  huggingface: 'https://huggingface.co/settings/tokens',
  grok: 'https://x.ai/api',
  qwen: 'https://dashscope.console.aliyun.com/apiKey',
  comfyui: 'https://github.com/comfyanonymous/ComfyUI',
};

interface ProviderHelpTextProps {
  provider: AIProvider;
}

export default function ProviderHelpText({ provider }: ProviderHelpTextProps) {
  const desc = PROVIDER_DESCRIPTIONS[provider];
  const link = DOCS_LINKS[provider];

  return (
    <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-secondary/40 border border-border/30">
      <span className="text-base mt-0.5">ℹ️</span>
      <div>
        <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
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
