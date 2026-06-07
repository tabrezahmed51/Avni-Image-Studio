interface AdvancedSettingsPanelProps {
  maxFallbackAttempts: number;
  streamChatResponses: boolean;
  imageUploadStrategy: 'base64' | 'url' | 'direct';
  onChange: (settings: {
    maxFallbackAttempts?: number;
    streamChatResponses?: boolean;
    imageUploadStrategy?: 'base64' | 'url' | 'direct';
    debugMode?: boolean;
  }) => void;
}

export default function AdvancedSettingsPanel({
  maxFallbackAttempts, streamChatResponses, imageUploadStrategy, onChange,
}: AdvancedSettingsPanelProps) {
  return (
    <div className="space-y-4">
      {/* Max fallback attempts */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
          Max Fallback Attempts
        </label>
        <p className="text-[11px] text-muted-foreground">How many providers to try before giving up on a failed request.</p>
        <div className="flex items-center gap-3">
          <input
            type="range" min={1} max={7}
            value={maxFallbackAttempts}
            onChange={(e) => onChange({ maxFallbackAttempts: Number(e.target.value) })}
            className="flex-1 accent-primary"
          />
          <span className="w-6 text-center text-xs font-bold text-foreground">{maxFallbackAttempts}</span>
        </div>
      </div>

      {/* Stream chat */}
      <div className="flex items-center justify-between py-2 border-b border-border/30">
        <div>
          <p className="text-xs font-medium text-foreground">Stream Chat Responses</p>
          <p className="text-[11px] text-muted-foreground">Show assistant responses as they stream in real-time.</p>
        </div>
        <button
          onClick={() => onChange({ streamChatResponses: !streamChatResponses })}
          className={`relative w-10 h-5 rounded-full transition-colors ${streamChatResponses ? 'bg-primary' : 'bg-secondary'}`}
        >
          <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${streamChatResponses ? 'translate-x-5' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {/* Image upload strategy */}
      <div className="space-y-1.5">
        <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Image Upload Strategy</label>
        <p className="text-[11px] text-muted-foreground">How source images are sent to edit-capable providers.</p>
        <div className="grid grid-cols-3 gap-2">
          {(['base64', 'url', 'direct'] as const).map((strategy) => (
            <button
              key={strategy}
              onClick={() => onChange({ imageUploadStrategy: strategy })}
              className={`py-2 rounded-xl text-[11px] font-medium capitalize transition-all border ${
                imageUploadStrategy === strategy
                  ? 'studio-gradient text-white border-transparent'
                  : 'bg-secondary/50 text-muted-foreground border-border/40 hover:border-primary/30'
              }`}
            >
              {strategy}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
