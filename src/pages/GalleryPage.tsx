import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles, ImageIcon, Download, Heart, Filter, SortDesc,
  RefreshCw, X, Share2, Tag, Globe, ChevronDown, ArrowUpRight,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface GalleryImage {
  id: string;
  image_url: string;
  prompt: string;
  style: string;
  aspect_ratio: string;
  likes: number;
  published_at: string;
}

const STYLE_FILTERS = [
  { label: 'All', value: '' },
  { label: 'Photorealistic', value: 'photorealistic' },
  { label: 'Cyberpunk', value: 'cyberpunk' },
  { label: 'Fantasy', value: 'fantasy' },
  { label: 'Digital Art', value: 'digital art' },
  { label: 'Watercolor', value: 'watercolor' },
  { label: 'Minimalist', value: 'minimalist' },
];

const SORT_OPTIONS = [
  { label: 'Latest', value: 'published_at' },
  { label: 'Most Liked', value: 'likes' },
  { label: 'Random', value: 'random' },
];

// Extract style tags from a style string
function extractStyleTags(style: string): string[] {
  if (!style) return [];
  const cleanStyle = style.toLowerCase();
  const knownTags = ['photorealistic', 'cyberpunk', 'fantasy', 'digital art', 'watercolor', 'minimalist', 'neon', 'dark', 'vibrant', 'epic', 'cinematic', 'artistic', '8k', 'ultra hd'];
  return knownTags.filter(t => cleanStyle.includes(t)).slice(0, 3);
}

export default function GalleryPage() {
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [styleFilter, setStyleFilter] = useState('');
  const [sortBy, setSortBy] = useState('published_at');
  const [selectedImage, setSelectedImage] = useState<GalleryImage | null>(null);
  const [newCount, setNewCount] = useState(0);
  const [sortOpen, setSortOpen] = useState(false);
  const lastFetchRef = useRef<Date>(new Date());
  const pollingRef = useRef<ReturnType<typeof setInterval>>();

  // ─ Fetch gallery ────────────────────────────────────────────────────
  const fetchImages = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    let query = supabase
      .from('public_gallery')
      .select('id, image_url, prompt, style, aspect_ratio, likes, published_at')
      .eq('is_approved', true);

    if (styleFilter) {
      query = query.ilike('style', `%${styleFilter}%`);
    }

    if (sortBy === 'random') {
      // Fetch more and shuffle
      query = query.limit(60);
    } else {
      query = query.order(sortBy, { ascending: false }).limit(60);
    }

    const { data, error } = await query;
    if (!error && data) {
      let result = data as GalleryImage[];
      if (sortBy === 'random') {
        result = [...result].sort(() => Math.random() - 0.5);
      }
      setImages(result);
    }
    setLoading(false);
    lastFetchRef.current = new Date();
  }, [styleFilter, sortBy]);

  // ─ Poll for new images ───────────────────────────────────────────────
  const pollForNew = useCallback(async () => {
    const { data } = await supabase
      .from('public_gallery')
      .select('id')
      .eq('is_approved', true)
      .gt('published_at', lastFetchRef.current.toISOString());

    const count = data?.length ?? 0;
    if (count > 0) {
      setNewCount(count);
    }
  }, []);

  useEffect(() => {
    fetchImages(true);
  }, [fetchImages]);

  // Start polling
  useEffect(() => {
    pollingRef.current = setInterval(pollForNew, 30000); // 30s
    return () => clearInterval(pollingRef.current);
  }, [pollForNew]);

  // Show new images toast when count changes
  useEffect(() => {
    if (newCount > 0) {
      toast(`${newCount} new image${newCount > 1 ? 's' : ''} published!`, {
        action: {
          label: 'Refresh',
          onClick: () => { setNewCount(0); fetchImages(false); },
        },
        duration: 8000,
      });
    }
  }, [newCount, fetchImages]);

  // Handle share
  const handleShare = async (image: GalleryImage) => {
    const url = `${window.location.origin}/gallery?id=${image.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success('Link copied!');
    } catch {
      toast.error('Could not copy link');
    }
  };

  // Check for ?id= param to auto-open
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get('id');
    if (id && images.length > 0) {
      const found = images.find(img => img.id === id);
      if (found) setSelectedImage(found);
    }
  }, [images]);

  return (
    <div className="min-h-screen bg-background mesh-bg">
      {/* Nav */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/30 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-7 h-7 studio-gradient rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-display text-base font-bold text-studio hidden sm:block">Avni Image Studio</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 rounded-full border border-border/40 text-[10px] text-muted-foreground">
              <Globe className="w-3 h-3 text-primary" />Public Gallery
            </div>
            <Link to="/">
              <Button variant="outline" size="sm" className="border-border/50 text-xs h-8 px-3">
                ← Studio
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <section className="pt-24 pb-8 px-4 sm:px-6 text-center">
        <div className="absolute top-16 left-1/3 w-48 h-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 glass-card rounded-full px-3 py-1.5 mb-4 text-xs text-muted-foreground">
            <Globe className="w-3 h-3 text-primary" />
            {images.length} community creations
          </div>
          <h1 className="font-display text-3xl sm:text-4xl md:text-5xl font-black text-foreground mb-2">
            Community <span className="text-studio">Gallery</span>
          </h1>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            AI-generated masterpieces from the Avni community. Every image is unique.
          </p>
        </div>
      </section>

      {/* Filters & Sort */}
      <div className="sticky top-14 z-40 bg-background/80 backdrop-blur border-b border-border/30 px-4 sm:px-6 py-3">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          {/* Style filter tabs */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            {STYLE_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setStyleFilter(f.value)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                  styleFilter === f.value
                    ? 'studio-gradient text-white'
                    : 'bg-secondary/50 text-muted-foreground hover:text-foreground border border-border/40'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Sort dropdown */}
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setSortOpen(o => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-secondary/50 border border-border/40 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <SortDesc className="w-3.5 h-3.5" />
              {SORT_OPTIONS.find(s => s.value === sortBy)?.label}
              <ChevronDown className="w-3 h-3" />
            </button>
            {sortOpen && (
              <div className="absolute right-0 top-full mt-1.5 z-50 w-36 glass-card rounded-xl border border-border/40 shadow-xl overflow-hidden">
                {SORT_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => { setSortBy(opt.value); setSortOpen(false); }}
                    className={`w-full px-3 py-2 text-xs text-left transition-colors ${
                      sortBy === opt.value ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/60'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New images banner */}
      {newCount > 0 && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-3">
          <div className="flex items-center justify-between p-3 rounded-xl bg-primary/10 border border-primary/30 text-xs">
            <span className="text-primary font-medium">{newCount} new image{newCount > 1 ? 's' : ''} just published</span>
            <button
              onClick={() => { setNewCount(0); fetchImages(false); }}
              className="flex items-center gap-1 text-primary hover:text-primary/80"
            >
              <RefreshCw className="w-3 h-3" />Refresh
            </button>
          </div>
        </div>
      )}

      {/* Gallery grid */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 pb-20">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-secondary/30 animate-pulse" />
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <ImageIcon className="w-12 h-12 text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground text-sm">No images yet for this filter.</p>
            <p className="text-muted-foreground/60 text-xs mt-1">Generate images in the studio and publish them here!</p>
            <Link to="/">
              <Button className="mt-4 studio-gradient text-white border-0 text-xs">
                Go to Studio
              </Button>
            </Link>
          </div>
        ) : (
          <div className="columns-2 sm:columns-3 lg:columns-4 gap-3 space-y-3">
            {images.map(img => {
              const tags = extractStyleTags(img.style);
              return (
                <div
                  key={img.id}
                  className="break-inside-avoid group relative overflow-hidden rounded-xl border border-border/30 bg-card cursor-pointer hover:border-primary/40 transition-all duration-300"
                  onClick={() => setSelectedImage(img)}
                >
                  <img
                    src={img.image_url}
                    alt={img.prompt}
                    className="w-full h-auto block object-cover group-hover:scale-[1.02] transition-transform duration-500"
                    loading="lazy"
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-2.5">
                    <p className="text-white text-[10px] line-clamp-2 leading-relaxed mb-1.5">{img.prompt}</p>
                    {/* Tag chips */}
                    {tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1.5">
                        {tags.map(t => (
                          <span key={t} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-white/15 text-white/80 text-[9px] font-medium backdrop-blur-sm">
                            <Tag className="w-2 h-2" />{t}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-white/60 text-[10px]">
                        <Heart className="w-3 h-3" />{img.likes}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleShare(img); }}
                          className="w-6 h-6 rounded-md bg-white/15 hover:bg-white/25 flex items-center justify-center"
                        >
                          <Share2 className="w-3 h-3 text-white" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); const a = document.createElement('a'); a.href = img.image_url; a.download = 'avni-gallery.png'; a.click(); }}
                          className="w-6 h-6 rounded-md bg-white/15 hover:bg-white/25 flex items-center justify-center"
                        >
                          <Download className="w-3 h-3 text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {/* Expand icon */}
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-md bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowUpRight className="w-3 h-3 text-white/70" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Lightbox */}
      {selectedImage && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setSelectedImage(null)}
        >
          <button
            onClick={() => setSelectedImage(null)}
            className="absolute top-4 right-4 w-8 h-8 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4 text-white" />
          </button>
          <div
            className="max-w-3xl w-full glass-card rounded-2xl overflow-hidden border border-border/40"
            onClick={e => e.stopPropagation()}
          >
            <img src={selectedImage.image_url} alt={selectedImage.prompt} className="w-full h-auto max-h-[70vh] object-contain" />
            <div className="p-4">
              <p className="text-sm text-foreground/90 leading-relaxed mb-3">{selectedImage.prompt}</p>
              {/* Tags */}
              {extractStyleTags(selectedImage.style).length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {extractStyleTags(selectedImage.style).map(t => (
                    <span key={t} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-secondary text-muted-foreground text-xs">
                      <Tag className="w-2.5 h-2.5" />{t}
                    </span>
                  ))}
                </div>
              )}
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => { const a = document.createElement('a'); a.href = selectedImage.image_url; a.download = 'avni-gallery.png'; a.click(); }}
                  className="studio-gradient text-white border-0 text-xs"
                  size="sm"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />Download
                </Button>
                <Button onClick={() => handleShare(selectedImage)} variant="outline" size="sm" className="border-border text-xs">
                  <Share2 className="w-3.5 h-3.5 mr-1" />Share Link
                </Button>
                <div className="ml-auto flex items-center gap-1 text-muted-foreground text-xs">
                  <Heart className="w-3.5 h-3.5" />{selectedImage.likes}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-border/30 py-4 px-4 sm:px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-muted-foreground">
          <span>Avni Image Studio — Public Gallery</span>
          <Link to="/" className="text-primary hover:underline">Create your own →</Link>
        </div>
      </footer>
    </div>
  );
}
