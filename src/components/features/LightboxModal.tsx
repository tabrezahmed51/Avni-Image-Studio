import { useEffect, useCallback, useState } from 'react';
import { X, ChevronLeft, ChevronRight, Download, Share2, ZoomIn, ZoomOut } from 'lucide-react';

export interface LightboxImage {
  imageUrl: string;
  prompt: string;
}

interface LightboxModalProps {
  images: LightboxImage[];
  initialIndex: number;
  onClose: () => void;
}

export default function LightboxModal({ images, initialIndex, onClose }: LightboxModalProps) {
  const [index, setIndex] = useState(initialIndex);
  const [zoomed, setZoomed] = useState(false);
  const [imgPos, setImgPos] = useState({ x: 0, y: 0 });
  const [draggingZoom, setDraggingZoom] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const current = images[index];
  const hasPrev = index > 0;
  const hasNext = index < images.length - 1;

  const goPrev = useCallback(() => { if (hasPrev) { setIndex(i => i - 1); setZoomed(false); setImgPos({ x: 0, y: 0 }); } }, [hasPrev]);
  const goNext = useCallback(() => { if (hasNext) { setIndex(i => i + 1); setZoomed(false); setImgPos({ x: 0, y: 0 }); } }, [hasNext]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'ArrowLeft') goPrev();
    if (e.key === 'ArrowRight') goNext();
  }, [onClose, goPrev, goNext]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = current.imageUrl;
    a.download = 'avni-studio.png';
    a.click();
  };

  const handleShare = async () => {
    const shareData = { title: 'Avni Image Studio', text: current.prompt, url: current.imageUrl };
    if (navigator.share && navigator.canShare?.(shareData)) {
      try { await navigator.share(shareData); } catch { await navigator.clipboard.writeText(current.imageUrl); }
    } else {
      try { await navigator.clipboard.writeText(current.imageUrl); } catch {}
    }
  };

  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (!zoomed) return;
    setDraggingZoom(true);
    setDragStart({ x: e.clientX - imgPos.x, y: e.clientY - imgPos.y });
  };
  const handleImageMouseMove = (e: React.MouseEvent) => {
    if (!draggingZoom) return;
    setImgPos({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleImageMouseUp = () => setDraggingZoom(false);

  const toggleZoom = () => {
    setZoomed(z => !z);
    setImgPos({ x: 0, y: 0 });
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 backdrop-blur-md"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-white/40 font-mono">{index + 1} / {images.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleZoom} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors" title={zoomed ? 'Zoom out' : 'Zoom in'}>
            {zoomed ? <ZoomOut className="w-4 h-4 text-white" /> : <ZoomIn className="w-4 h-4 text-white" />}
          </button>
          <button onClick={handleShare} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <Share2 className="w-4 h-4 text-white" />
          </button>
          <button onClick={handleDownload} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors">
            <Download className="w-4 h-4 text-white" />
          </button>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors ml-1">
            <X className="w-4 h-4 text-white" />
          </button>
        </div>
      </div>

      {/* Image area */}
      <div
        className="flex-1 relative overflow-hidden flex items-center justify-center"
        onMouseMove={handleImageMouseMove}
        onMouseUp={handleImageMouseUp}
        onMouseLeave={handleImageMouseUp}
      >
        {/* Prev button */}
        {hasPrev && (
          <button
            onClick={goPrev}
            className="absolute left-3 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-all border border-white/10 hover:border-white/20"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
        )}

        {/* Image */}
        <div
          className={`transition-transform duration-200 ${zoomed ? 'cursor-grab' : 'cursor-zoom-in'} ${draggingZoom ? 'cursor-grabbing' : ''}`}
          style={{
            transform: zoomed
              ? `scale(2) translate(${imgPos.x / 2}px, ${imgPos.y / 2}px)`
              : 'scale(1)',
            transition: draggingZoom ? 'none' : 'transform 0.2s ease',
          }}
          onClick={!draggingZoom ? toggleZoom : undefined}
          onMouseDown={handleImageMouseDown}
        >
          <img
            src={current.imageUrl}
            alt={current.prompt}
            className="max-h-[calc(100vh-180px)] max-w-[calc(100vw-80px)] w-auto h-auto object-contain rounded-lg select-none"
            draggable={false}
          />
        </div>

        {/* Next button */}
        {hasNext && (
          <button
            onClick={goNext}
            className="absolute right-3 z-10 w-10 h-10 rounded-full bg-white/10 hover:bg-white/25 flex items-center justify-center transition-all border border-white/10 hover:border-white/20"
          >
            <ChevronRight className="w-5 h-5 text-white" />
          </button>
        )}
      </div>

      {/* Bottom prompt bar */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-white/10">
        <p className="text-xs text-white/70 text-center max-w-2xl mx-auto leading-relaxed line-clamp-2">
          <span className="text-white/40 mr-1.5">Prompt:</span>
          {current.prompt}
        </p>
        {/* Dot navigation */}
        {images.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-2">
            {images.map((_, i) => (
              <button
                key={i}
                onClick={() => { setIndex(i); setZoomed(false); setImgPos({ x: 0, y: 0 }); }}
                className={`rounded-full transition-all ${i === index ? 'w-4 h-1.5 bg-white' : 'w-1.5 h-1.5 bg-white/30 hover:bg-white/50'}`}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
