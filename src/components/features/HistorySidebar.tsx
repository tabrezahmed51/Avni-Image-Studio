import { X, Download, Trash2, Clock, ImageOff, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { HistoryItem } from '@/hooks/useCreationHistory';

interface HistorySidebarProps {
  open: boolean;
  onClose: () => void;
  history: HistoryItem[];
  onRemove: (id: string) => void;
  onClearAll: () => void;
}

function formatTimestamp(ms: number): string {
  const now = Date.now();
  const diff = now - ms;
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);

  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(ms).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function HistoryCard({
  item,
  onRemove,
}: {
  item: HistoryItem;
  onRemove: (id: string) => void;
}) {
  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = item.imageUrl;
    a.download = `avni-studio-${item.id.slice(0, 8)}.png`;
    a.click();
  };

  return (
    <div className="group relative flex gap-3 p-3 rounded-xl bg-secondary/40 border border-border/40 hover:border-primary/30 transition-all duration-200">
      {/* Thumbnail */}
      <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-secondary border border-border/30">
        <img
          src={item.imageUrl}
          alt={item.prompt}
          className="w-full h-full object-cover"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = 'none';
            (e.currentTarget.nextElementSibling as HTMLElement | null)?.classList.remove('hidden');
          }}
        />
        <div className="hidden w-full h-full flex items-center justify-center">
          <ImageOff className="w-5 h-5 text-muted-foreground" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-foreground leading-snug line-clamp-2 font-medium mb-1">
          {item.prompt}
        </p>
        <div className="flex items-center gap-2">
          {item.style && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-primary/15 text-primary/90 font-medium truncate max-w-[70px]">
              {item.style.split(',')[0]}
            </span>
          )}
          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-secondary text-muted-foreground font-medium">
            {item.aspectRatio}
          </span>
        </div>
        <div className="flex items-center gap-1 mt-1.5">
          <Clock className="w-2.5 h-2.5 text-muted-foreground/60" />
          <span className="text-[10px] text-muted-foreground/60">{formatTimestamp(item.createdAt)}</span>
        </div>
      </div>

      {/* Action buttons — appear on hover */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleDownload}
          title="Download"
          className="w-6 h-6 rounded-md bg-primary/80 hover:bg-primary flex items-center justify-center transition-colors"
        >
          <Download className="w-3 h-3 text-white" />
        </button>
        <button
          onClick={() => onRemove(item.id)}
          title="Remove"
          className="w-6 h-6 rounded-md bg-destructive/70 hover:bg-destructive flex items-center justify-center transition-colors"
        >
          <Trash2 className="w-3 h-3 text-white" />
        </button>
      </div>
    </div>
  );
}

export default function HistorySidebar({
  open,
  onClose,
  history,
  onRemove,
  onClearAll,
}: HistorySidebarProps) {
  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={`fixed top-0 right-0 z-50 h-full w-80 flex flex-col transition-transform duration-300 ease-in-out
          bg-card border-l border-border/40 shadow-2xl
          ${open ? 'translate-x-0' : 'translate-x-full'}`}
        style={{ backdropFilter: 'blur(16px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 studio-gradient rounded-lg flex items-center justify-center">
              <History className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Creation History</h2>
              <p className="text-[11px] text-muted-foreground">{history.length} / 20 saved</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
            aria-label="Close history"
          >
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-12">
              <div className="w-14 h-14 rounded-2xl bg-secondary/60 flex items-center justify-center">
                <ImageOff className="w-6 h-6 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground mb-1">No creations yet</p>
                <p className="text-xs text-muted-foreground leading-relaxed max-w-[180px] mx-auto">
                  Generate your first image and it will appear here automatically.
                </p>
              </div>
            </div>
          ) : (
            history.map((item) => (
              <HistoryCard key={item.id} item={item} onRemove={onRemove} />
            ))
          )}
        </div>

        {/* Footer */}
        {history.length > 0 && (
          <div className="px-4 py-3 border-t border-border/40">
            <Button
              onClick={onClearAll}
              variant="outline"
              size="sm"
              className="w-full text-xs border-destructive/30 text-destructive hover:bg-destructive/10 hover:border-destructive/50"
            >
              <Trash2 className="w-3 h-3 mr-1.5" />
              Clear All History
            </Button>
          </div>
        )}
      </aside>
    </>
  );
}
