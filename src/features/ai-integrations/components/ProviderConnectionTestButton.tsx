import { useState } from 'react';
import { Loader2, CheckCircle, XCircle, Wifi } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { AIProvider, ProviderConfig } from '../types/aiIntegration.types';
import { useProviderConnectionTest } from '../hooks/useProviderConnectionTest';

interface ProviderConnectionTestButtonProps {
  provider: AIProvider;
  config: ProviderConfig;
}

export default function ProviderConnectionTestButton({ provider, config }: ProviderConnectionTestButtonProps) {
  const { testConnection, testing } = useProviderConnectionTest();
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);
  const isLoading = testing[provider] ?? false;

  const handleTest = async () => {
    setResult(null);
    const res = await testConnection(provider, config);
    setResult(res);
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleTest}
        disabled={isLoading}
        variant="outline"
        size="sm"
        className="w-full text-xs border-primary/30 hover:border-primary/60 py-2 h-auto"
      >
        {isLoading ? (
          <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />Testing…</>
        ) : (
          <><Wifi className="w-3.5 h-3.5 mr-1.5" />Test Connection</>
        )}
      </Button>
      {result && (
        <div className={`flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${result.ok ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
          {result.ok
            ? <CheckCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            : <XCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          }
          <span>{result.ok ? 'Connection successful!' : (result.error ?? 'Connection failed')}</span>
        </div>
      )}
    </div>
  );
}
