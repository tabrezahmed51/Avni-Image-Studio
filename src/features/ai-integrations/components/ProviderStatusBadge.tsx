import type { ProviderStatus } from '../types/aiIntegration.types';

const STATUS_CONFIG: Record<ProviderStatus, { label: string; color: string; dot: string }> = {
  connected:       { label: 'Connected',     color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400' },
  invalid_key:     { label: 'Invalid Key',   color: 'bg-red-500/15 text-red-400 border-red-500/20',           dot: 'bg-red-400' },
  not_configured:  { label: 'Not Configured',color: 'bg-secondary text-muted-foreground border-border/40',    dot: 'bg-muted-foreground/40' },
  rate_limited:    { label: 'Rate Limited',  color: 'bg-amber-500/15 text-amber-400 border-amber-500/20',     dot: 'bg-amber-400' },
  offline:         { label: 'Offline',       color: 'bg-red-500/15 text-red-400 border-red-500/20',           dot: 'bg-red-400 animate-pulse' },
  testing:         { label: 'Testing…',      color: 'bg-blue-500/15 text-blue-400 border-blue-500/20',        dot: 'bg-blue-400 animate-ping' },
};

interface ProviderStatusBadgeProps {
  status: ProviderStatus;
}

export default function ProviderStatusBadge({ status }: ProviderStatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.not_configured;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cfg.color}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}
