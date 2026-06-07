import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import type { AIProvider, ProviderAuthConfig } from '../types/aiIntegration.types';

interface ProviderAuthFieldsProps {
  provider: AIProvider;
  auth: ProviderAuthConfig;
  onChange: (auth: Partial<ProviderAuthConfig>) => void;
}

function SecretInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? 'Enter key…'}
          className="w-full bg-secondary/50 border border-border/60 rounded-lg px-3 pr-9 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {show ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
        </button>
      </div>
    </div>
  );
}

export default function ProviderAuthFields({ provider, auth, onChange }: ProviderAuthFieldsProps) {
  const isComfyUI = provider === 'comfyui';

  return (
    <div className="space-y-3">
      {!isComfyUI && (
        <SecretInput
          label="API Key"
          value={auth.apiKey ?? ''}
          onChange={(v) => onChange({ apiKey: v })}
          placeholder={`sk-… or paste your ${provider} API key`}
        />
      )}
      {provider === 'openai' && (
        <div className="space-y-1">
          <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">Organization ID (optional)</label>
          <input
            type="text"
            value={auth.organizationId ?? ''}
            onChange={(e) => onChange({ organizationId: e.target.value })}
            placeholder="org-…"
            className="w-full bg-secondary/50 border border-border/60 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
          />
        </div>
      )}
      {isComfyUI && (
        <p className="text-[11px] text-muted-foreground italic">ComfyUI does not require an API key for local instances. Configure the base URL in Endpoints below.</p>
      )}
    </div>
  );
}
