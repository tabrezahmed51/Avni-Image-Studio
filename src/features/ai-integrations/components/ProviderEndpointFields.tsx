import type { AIProvider, ProviderEndpointConfig, ProviderCapabilities } from '../types/aiIntegration.types';

interface ProviderEndpointFieldsProps {
  provider: AIProvider;
  endpoints: ProviderEndpointConfig;
  capabilities: ProviderCapabilities;
  onChange: (endpoints: Partial<ProviderEndpointConfig>) => void;
}

function Field({
  label, value, onChange, placeholder, type = 'text'
}: {
  label: string; value: string | number; onChange: (v: string) => void; placeholder?: string; type?: string
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-secondary/50 border border-border/60 rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/50 focus:outline-none focus:ring-1 focus:ring-primary/50"
      />
    </div>
  );
}

export default function ProviderEndpointFields({ provider, endpoints, capabilities, onChange }: ProviderEndpointFieldsProps) {
  const showAll = capabilities.customEndpoint || capabilities.selfHosted || capabilities.gradioSpace;
  const isComfyUI = provider === 'comfyui';

  return (
    <div className="space-y-3">
      {(showAll || isComfyUI) && (
        <Field
          label={isComfyUI ? 'ComfyUI Server URL' : 'Base URL'}
          value={endpoints.baseUrl ?? ''}
          onChange={(v) => onChange({ baseUrl: v })}
          placeholder={isComfyUI ? 'http://localhost:8188' : 'https://api.example.com'}
        />
      )}
      {isComfyUI && (
        <>
          <Field label="Health Check Path" value={endpoints.healthPath ?? '/system_stats'} onChange={(v) => onChange({ healthPath: v })} placeholder="/system_stats" />
          <Field label="Queue Endpoint (Text→Image)" value={endpoints.textToImagePath ?? '/prompt'} onChange={(v) => onChange({ textToImagePath: v })} placeholder="/prompt" />
          <Field label="Image Edit Path" value={endpoints.imageEditPath ?? '/prompt'} onChange={(v) => onChange({ imageEditPath: v })} placeholder="/prompt" />
        </>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Timeout (ms)"
          type="number"
          value={endpoints.timeoutMs ?? 45000}
          onChange={(v) => onChange({ timeoutMs: Number(v) })}
          placeholder="45000"
        />
        <Field
          label="Retry Count"
          type="number"
          value={endpoints.retryCount ?? 1}
          onChange={(v) => onChange({ retryCount: Number(v) })}
          placeholder="1"
        />
      </div>
    </div>
  );
}
