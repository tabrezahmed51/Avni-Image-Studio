import { useState, useRef, useCallback, useEffect } from 'react';
import { Move } from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeUrl: string;
  afterUrl: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export default function BeforeAfterSlider({
  beforeUrl,
  afterUrl,
  beforeLabel = 'Before',
  afterLabel = 'After',
}: BeforeAfterSliderProps) {
  const [position, setPosition] = useState(50); // 0–100 %
  const [dragging, setDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const calcPosition = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setPosition((x / rect.width) * 100);
  }, []);

  const onMouseDown = (e: React.MouseEvent) => { e.preventDefault(); setDragging(true); calcPosition(e.clientX); };
  const onTouchStart = (e: React.TouchEvent) => { setDragging(true); calcPosition(e.touches[0].clientX); };

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => calcPosition(e.clientX);
    const onTouchMove = (e: TouchEvent) => calcPosition(e.touches[0].clientX);
    const onUp = () => setDragging(false);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('touchmove', onTouchMove);
    window.addEventListener('touchend', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onUp);
    };
  }, [dragging, calcPosition]);

  return (
    <div
      ref={containerRef}
      className="relative w-full overflow-hidden rounded-xl select-none border border-border/50"
      style={{ cursor: dragging ? 'ew-resize' : 'col-resize' }}
      onMouseDown={onMouseDown}
      onTouchStart={onTouchStart}
    >
      {/* After (full width, clipped on right) */}
      <img src={afterUrl} alt="After" className="w-full h-auto block" draggable={false} />

      {/* Before (clipped on left by slider position) */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ width: `${position}%` }}
      >
        <img
          src={beforeUrl}
          alt="Before"
          className="absolute top-0 left-0 h-full object-cover"
          style={{ width: `${100 / (position / 100)}%`, maxWidth: 'none' }}
          draggable={false}
        />
      </div>

      {/* Divider line */}
      <div
        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"
        style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
      />

      {/* Drag handle */}
      <div
        className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white shadow-lg flex items-center justify-center z-10 border-2 border-primary/40"
        style={{ left: `${position}%` }}
      >
        <Move className="w-4 h-4 text-gray-700" />
      </div>

      {/* Labels */}
      <div className="absolute bottom-2 left-3 text-[10px] font-semibold uppercase tracking-wider text-white bg-black/60 px-2 py-0.5 rounded-md pointer-events-none">
        {beforeLabel}
      </div>
      <div className="absolute bottom-2 right-3 text-[10px] font-semibold uppercase tracking-wider text-white bg-black/60 px-2 py-0.5 rounded-md pointer-events-none">
        {afterLabel}
      </div>
    </div>
  );
}
