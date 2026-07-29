import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles, ImageIcon, Wand2, Layers, Zap, Globe,
  ChevronDown, Download, RefreshCw, ArrowRight, Star,
  History, Share2, Upload, X, Lightbulb, Plus, Package, Settings2,
  LogOut, ShieldCheck, User,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import AIIntegrationsModal from '@/features/ai-integrations/components/AIIntegrationsModal';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { generateImage, getInspirePrompts, convertImageToBase64, downloadAllImagesAsZip } from '@/lib/api';
import { useCreationHistory } from '@/hooks/useCreationHistory';
import HistorySidebar from '@/components/features/HistorySidebar';
import LightboxModal, { type LightboxImage } from '@/components/features/LightboxModal';
import BeforeAfterSlider from '@/components/features/BeforeAfterSlider';
import AvniAIChat, { type AvniAction } from '@/components/features/AvniAIChat';

// ─── Constants ──────────────────────────────────────────────────────
const GALLERY_PROMPTS = [
  { prompt: 'Cosmic nebula galaxy with vibrant purple and gold colors, ultra detailed', ar: '1:1' },
  { prompt: 'Futuristic city skyline at dusk with neon lights reflecting on water', ar: '16:9' },
  { prompt: 'Ethereal forest with glowing bioluminescent plants and magical atmosphere', ar: '4:3' },
  { prompt: 'Abstract geometric art with iridescent crystals and light refractions', ar: '1:1' },
  { prompt: 'Surreal dreamscape floating islands with waterfalls and golden sunset', ar: '16:9' },
  { prompt: 'Underwater kingdom with coral palace and colorful sea life', ar: '4:3' },
];

const STYLE_PRESETS = [
  { label: 'Photorealistic', value: 'photorealistic, 8K ultra HD, hyperrealistic' },
  { label: 'Digital Art', value: 'digital art, vibrant, concept art, artstation' },
  { label: 'Watercolor', value: 'watercolor painting, soft edges, artistic' },
  { label: 'Cyberpunk', value: 'cyberpunk, neon lights, futuristic, dark atmosphere' },
  { label: 'Fantasy', value: 'fantasy art, magical, epic, detailed illustration' },
  { label: 'Minimalist', value: 'minimalist, clean, simple, elegant, modern' },
];

const ASPECT_RATIOS = [
  { label: 'Square', value: '1:1', icon: '⬜' },
  { label: 'Wide', value: '16:9', icon: '▭' },
  { label: 'Tall', value: '9:16', icon: '▯' },
  { label: '4:3', value: '4:3', icon: '▬' },
];

const TAG_GROUPS = [
  {
    label: 'Lighting',
    color: 'bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border-amber-500/20',
    activeColor: 'bg-amber-500/40 text-amber-200 border-amber-400/50',
    tags: ['golden hour', 'neon glow', 'soft light', 'dramatic shadows', 'backlit', 'moonlight'],
  },
  {
    label: 'Mood',
    color: 'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border-rose-500/20',
    activeColor: 'bg-rose-500/40 text-rose-200 border-rose-400/50',
    tags: ['epic', 'serene', 'dark', 'whimsical', 'mysterious', 'vibrant'],
  },
  {
    label: 'Subject',
    color: 'bg-sky-500/15 text-sky-300 hover:bg-sky-500/25 border-sky-500/20',
    activeColor: 'bg-sky-500/40 text-sky-200 border-sky-400/50',
    tags: ['portrait', 'landscape', 'architecture', 'nature', 'abstract', 'sci-fi'],
  },
];

const VARIATION_SUFFIXES = [
  'cinematic lighting, golden hour, film grain, bokeh',
  'vibrant neon colors, digital art concept, artstation trending',
  'soft watercolor, painterly brushstrokes, artistic texture',
];

interface GalleryItem {
  id: string;
  imageUrl: string;
  prompt: string;
  loading: boolean;
}

interface VariationItem {
  id: string;
  imageUrl: string | null;
  loading: boolean;
  suffix: string;
}

// ─── Feature Card ────────────────────────────────────────────────────
function FeatureCard({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="glass-card rounded-xl p-4 hover:border-primary/40 transition-all duration-300 hover:-translate-y-0.5">
      <div className="w-9 h-9 studio-gradient rounded-lg flex items-center justify-center mb-3">
        <Icon className="w-4 h-4 text-white" />
      </div>
      <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-muted-foreground text-xs leading-relaxed">{desc}</p>
    </div>
  );
}

// ─── Gallery Card ─────────────────────────────────────────────────────
function GalleryCard({ item, onClick }: { item: GalleryItem; onClick: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      className="relative overflow-hidden rounded-xl bg-card border border-border group cursor-pointer"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={!item.loading ? onClick : undefined}
    >
      {item.loading ? (
        <div className="aspect-square flex items-center justify-center bg-secondary/40">
          <div className="flex flex-col items-center gap-2">
            <div className="w-7 h-7 rounded-full studio-gradient animate-pulseGlow" />
            <p className="text-xs text-muted-foreground">Generating…</p>
          </div>
        </div>
      ) : (
        <>
          <img
            src={item.imageUrl}
            alt={item.prompt}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {hovered && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3">
              <p className="text-white text-xs line-clamp-2 leading-relaxed">{item.prompt}</p>
              <div className="flex gap-2 mt-1.5">
                <button
                  onClick={(e) => { e.stopPropagation(); const a = document.createElement('a'); a.href = item.imageUrl; a.download = 'avni-studio.png'; a.click(); }}
                  className="flex items-center gap-1 text-studio-gold text-xs font-medium hover:underline"
                >
                  <Download className="w-3 h-3" /> Download
                </button>
                <span className="text-white/30">·</span>
                <span className="text-white/60 text-xs">Click to expand</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Tag builder ──────────────────────────────────────────────────────
function PromptTagBuilder({ prompt, onAppend }: { prompt: string; onAppend: (tag: string) => void }) {
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set());

  const toggle = (tag: string) => {
    const next = new Set(activeTags);
    if (next.has(tag)) { next.delete(tag); onAppend(`__remove__${tag}`); }
    else { next.add(tag); onAppend(tag); }
    setActiveTags(next);
  };

  useEffect(() => {
    const lower = prompt.toLowerCase();
    const next = new Set<string>();
    TAG_GROUPS.forEach(g => g.tags.forEach(t => { if (lower.includes(t.toLowerCase())) next.add(t); }));
    setActiveTags(next);
  }, [prompt]);

  return (
    <div className="space-y-2">
      {TAG_GROUPS.map((group) => (
        <div key={group.label} className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground/60 w-12 shrink-0">{group.label}</span>
          {group.tags.map((tag) => {
            const active = activeTags.has(tag);
            return (
              <button
                key={tag}
                onClick={() => toggle(tag)}
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border transition-all ${active ? group.activeColor : group.color}`}
              >
                {active ? <X className="w-2.5 h-2.5" /> : <Plus className="w-2.5 h-2.5" />}
                {tag}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ─── Inspire Me ──────────────────────────────────────────────────────
function InspireButton({ prompt, onSelect }: { prompt: string; onSelect: (p: string) => void }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [theme, setTheme] = useState('');
  const [open, setOpen] = useState(false);

  const handleInspire = async () => {
    setLoading(true); setOpen(true); setSuggestions([]);
    try {
      const result = await getInspirePrompts(prompt.trim());
      setSuggestions(result.prompts || []);
      setTheme(result.theme || '');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to get inspirations');
      setOpen(false);
    } finally { setLoading(false); }
  };

  return (
    <div className="relative">
      <button
        onClick={handleInspire}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/20 text-amber-300 text-xs font-medium transition-all disabled:opacity-60"
      >
        <Lightbulb className={`w-3.5 h-3.5 ${loading ? 'animate-pulse' : ''}`} />
        {loading ? 'Thinking…' : 'Inspire Me'}
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-2 z-30 w-80 sm:w-96 glass-card rounded-xl border border-border/60 shadow-2xl p-3 animate-fadeUp">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {theme ? `Theme: ${theme}` : 'Prompt Ideas'}
            </span>
            <button onClick={() => setOpen(false)} className="w-5 h-5 rounded-md hover:bg-secondary flex items-center justify-center">
              <X className="w-3 h-3 text-muted-foreground" />
            </button>
          </div>
          {loading ? (
            <div className="flex items-center gap-2 py-4 justify-center">
              <div className="w-4 h-4 rounded-full studio-gradient animate-pulseGlow" />
              <span className="text-xs text-muted-foreground">Generating ideas…</span>
            </div>
          ) : (
            <div className="space-y-1.5">
              {suggestions.map((s, i) => (
                <button
                  key={i}
                  onClick={() => { onSelect(s); setOpen(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg bg-secondary/50 hover:bg-primary/10 hover:border-primary/30 border border-transparent text-xs text-foreground/90 leading-relaxed transition-all"
                >{s}</button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Edit Upload Zone ─────────────────────────────────────────────────
function EditUploadZone({ onImageSelected }: { onImageSelected: (base64: string, preview: string) => void }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) { toast.error('Please upload an image file'); return; }
    const base64 = await convertImageToBase64(file);
    onImageSelected(base64, base64);
  };
  const onDrop = (e: React.DragEvent) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); };

  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      className={`w-full flex flex-col items-center justify-center gap-2 py-6 rounded-xl border-2 border-dashed cursor-pointer transition-all ${dragging ? 'border-primary/70 bg-primary/10' : 'border-border/50 hover:border-primary/40 hover:bg-secondary/30'}`}
    >
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      <Upload className="w-6 h-6 text-muted-foreground/60" />
      <p className="text-xs text-muted-foreground text-center">
        <span className="text-primary font-medium">Click to upload</span> or drag & drop<br />PNG, JPG, WEBP supported
      </p>
    </div>
  );
}

// ─── Share Button ─────────────────────────────────────────────────────
function ShareButton({ imageUrl, prompt, className = '' }: { imageUrl: string; prompt: string; className?: string }) {
  const handleShare = async () => {
    const shareData = { title: 'Avni Image Studio', text: `AI-generated: "${prompt}"`, url: imageUrl };
    if (navigator.share && navigator.canShare?.(shareData)) {
      try { await navigator.share(shareData); toast.success('Shared!'); return; } catch (err) { if ((err as Error).name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(imageUrl); toast.success('Link copied!'); } catch { toast.error('Could not copy link'); }
  };
  return (
    <Button onClick={handleShare} variant="outline" className={`border-border hover:border-primary/50 text-xs py-2 ${className}`}>
      <Share2 className="w-3.5 h-3.5 mr-1" />Share
    </Button>
  );
}

// ─── Variation Card ───────────────────────────────────────────────────
function VariationCard({ item, prompt }: { item: VariationItem; prompt: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="relative overflow-hidden rounded-xl border border-border/50 bg-secondary/30 aspect-square">
        {item.loading ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <div className="w-6 h-6 rounded-full studio-gradient animate-pulseGlow" />
            <p className="text-[10px] text-muted-foreground">Creating…</p>
          </div>
        ) : item.imageUrl ? (
          <img src={item.imageUrl} alt="Variation" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">Failed</div>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground/70 leading-snug line-clamp-1">{item.suffix.split(',')[0]}</p>
      {item.imageUrl && !item.loading && (
        <div className="flex gap-1">
          <Button
            onClick={() => { const a = document.createElement('a'); a.href = item.imageUrl!; a.download = 'avni-variation.png'; a.click(); }}
            variant="outline" size="sm"
            className="flex-1 text-[10px] py-1.5 h-auto border-border/50"
          >
            <Download className="w-3 h-3 mr-1" />Save
          </Button>
          <ShareButton imageUrl={item.imageUrl} prompt={prompt} className="flex-1 text-[10px] py-1.5 h-auto" />
        </div>
      )}
    </div>
  );
}

// ─── User Avatar Menu ─────────────────────────────────────────────────
function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    logout();
  };

  if (!user) return null;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 pl-1 pr-2.5 py-1 rounded-xl bg-secondary/60 hover:bg-secondary border border-border/40 hover:border-primary/40 transition-all"
      >
        {user.avatar
          ? <img src={user.avatar} alt="" className="w-6 h-6 rounded-lg object-cover" />
          : <div className="w-6 h-6 rounded-lg studio-gradient flex items-center justify-center text-[11px] text-white font-bold">{user.username?.[0]?.toUpperCase()}</div>
        }
        <span className="text-xs text-foreground max-w-[80px] truncate hidden sm:block">{user.username}</span>
      </button>
      {open && (
        <div className="absolute top-full right-0 mt-1.5 z-50 w-44 glass-card rounded-xl border border-border/40 shadow-xl overflow-hidden" onClick={() => setOpen(false)}>
          <div className="px-3 py-2.5 border-b border-border/30">
            <p className="text-xs font-medium text-foreground truncate">{user.email}</p>
          </div>
          <button onClick={() => navigate('/admin')} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />Admin Panel
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors">
            <LogOut className="w-3.5 h-3.5" />Sign Out
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────
export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'generate' | 'edit'>('generate');
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Variations
  const [variations, setVariations] = useState<VariationItem[]>([]);
  const [generatingVariations, setGeneratingVariations] = useState(false);

  // Edit tab
  const [editPrompt, setEditPrompt] = useState('');
  const [editImageBase64, setEditImageBase64] = useState<string | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [editResult, setEditResult] = useState<string | null>(null);
  const [editGenerating, setEditGenerating] = useState(false);

  // Gallery
  const [gallery, setGallery] = useState<GalleryItem[]>([]);
  const [galleryLoaded, setGalleryLoaded] = useState(false);
  const [zipProgress, setZipProgress] = useState<{ packed: number; total: number } | null>(null);

  // Lightbox
  const [lightboxImages, setLightboxImages] = useState<LightboxImage[]>([]);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  // Sidebar
  const [historyOpen, setHistoryOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { history, addItem, removeItem, clearAll } = useCreationHistory();

  // ─ Tag logic
  const handleTagAppend = useCallback((tag: string) => {
    if (tag.startsWith('__remove__')) {
      const t = tag.replace('__remove__', '');
      setPrompt(prev => prev.replace(new RegExp(`,?\\s*${t}\\s*,?`, 'gi'), '').replace(/,\s*$/, '').trim());
    } else {
      setPrompt(prev => {
        if (prev.toLowerCase().includes(tag.toLowerCase())) return prev;
        return prev.trim() ? `${prev.trim()}, ${tag}` : tag;
      });
    }
  }, []);

  // ─ AI chat action handler
  const handleAvniAction = useCallback((action: AvniAction) => {
    switch (action.type) {
      case 'fill_prompt':
        setPrompt(String(action.payload));
        setActiveTab('generate');
        document.getElementById('generator')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'navigate':
        if (action.payload === 'top') window.scrollTo({ top: 0, behavior: 'smooth' });
        else document.getElementById(String(action.payload))?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'set_style':
        setStyle(String(action.payload));
        break;
      case 'set_aspect_ratio':
        setAspectRatio(String(action.payload));
        break;
      case 'open_history':
        setHistoryOpen(true);
        break;
      case 'switch_tab':
        setActiveTab(action.payload === 'edit' ? 'edit' : 'generate');
        document.getElementById('generator')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'open_settings':
        setSettingsOpen(true);
        break;
    }
  }, []);

  // ─ Open lightbox for gallery
  const openGalleryLightbox = useCallback((index: number) => {
    const imgs = gallery.filter(g => !g.loading && g.imageUrl).map(g => ({ imageUrl: g.imageUrl, prompt: g.prompt }));
    setLightboxImages(imgs);
    setLightboxIndex(index);
    setLightboxOpen(true);
  }, [gallery]);

  // ─ Open lightbox for single result
  const openResultLightbox = useCallback((imageUrl: string, promptText: string) => {
    setLightboxImages([{ imageUrl, prompt: promptText }]);
    setLightboxIndex(0);
    setLightboxOpen(true);
  }, []);

  // ─ Gallery seeding
  useEffect(() => {
    if (galleryLoaded) return;
    setGalleryLoaded(true);
    const items: GalleryItem[] = GALLERY_PROMPTS.map(p => ({ id: crypto.randomUUID(), imageUrl: '', prompt: p.prompt, loading: true }));
    setGallery(items);
    const genBatch = async (batch: typeof items, offset: number) => {
      await Promise.all(batch.map(async (item, i) => {
        const seed = GALLERY_PROMPTS[offset + i];
        try {
          const result = await generateImage(seed.prompt, seed.ar);
          setGallery(prev => prev.map(g => g.id === item.id ? { ...g, imageUrl: result.imageUrl, loading: false } : g));
        } catch {
          setGallery(prev => prev.map(g => g.id === item.id ? { ...g, imageUrl: `https://images.unsplash.com/photo-${1534224039826 + offset * 100 + i}?w=600&h=600&fit=crop`, loading: false } : g));
        }
      }));
    };
    genBatch(items.slice(0, 3), 0).then(() => genBatch(items.slice(3), 3));
  }, [galleryLoaded]);

  // ─ Generate
  const handleGenerate = async () => {
    if (!prompt.trim()) { toast.error('Please enter a prompt first'); return; }
    setGenerating(true); setGeneratedImage(null); setVariations([]);
    try {
      const result = await generateImage(prompt.trim(), aspectRatio, style);
      setGeneratedImage(result.imageUrl);
      toast.success('Image created!');
      setGallery(prev => [{ id: crypto.randomUUID(), imageUrl: result.imageUrl, prompt: prompt.trim(), loading: false }, ...prev]);
      addItem({ imageUrl: result.imageUrl, prompt: prompt.trim(), style, aspectRatio });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Generation failed'); }
    finally { setGenerating(false); }
  };

  // ─ Generate Variations
  const handleGenerateVariations = async () => {
    if (!prompt.trim() || !generatedImage) return;
    setGeneratingVariations(true);
    const initVariations: VariationItem[] = VARIATION_SUFFIXES.map((suffix, i) => ({
      id: `var-${i}`, imageUrl: null, loading: true, suffix,
    }));
    setVariations(initVariations);
    await Promise.all(VARIATION_SUFFIXES.map(async (suffix, i) => {
      try {
        const varPrompt = `${prompt.trim()}, ${suffix}`;
        const result = await generateImage(varPrompt, aspectRatio, style);
        setVariations(prev => prev.map(v => v.id === `var-${i}` ? { ...v, imageUrl: result.imageUrl, loading: false } : v));
        addItem({ imageUrl: result.imageUrl, prompt: varPrompt, style, aspectRatio });
      } catch {
        setVariations(prev => prev.map(v => v.id === `var-${i}` ? { ...v, loading: false } : v));
      }
    }));
    setGeneratingVariations(false);
    toast.success('Variations ready!');
  };

  // ─ Edit generate
  const handleEditGenerate = async () => {
    if (!editPrompt.trim()) { toast.error('Please enter a transformation prompt'); return; }
    if (!editImageBase64) { toast.error('Please upload an image to edit'); return; }
    setEditGenerating(true); setEditResult(null);
    try {
      const result = await generateImage(editPrompt.trim(), '1:1', '', editImageBase64);
      setEditResult(result.imageUrl);
      toast.success('Image edited!');
      addItem({ imageUrl: result.imageUrl, prompt: `[Edit] ${editPrompt.trim()}`, style: '', aspectRatio: '1:1' });
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : 'Edit failed'); }
    finally { setEditGenerating(false); }
  };

  // ─ Download All ZIP
  const handleDownloadAll = async () => {
    const readyImages = gallery.filter(g => !g.loading && g.imageUrl);
    if (!readyImages.length) { toast.error('No images to download yet'); return; }
    setZipProgress({ packed: 0, total: readyImages.length });
    try {
      await downloadAllImagesAsZip(
        readyImages.map((g, i) => ({ url: g.imageUrl, filename: `avni-gallery-${i + 1}.png` })),
        (packed, total) => setZipProgress({ packed, total })
      );
      toast.success(`Downloaded ${readyImages.length} images as ZIP!`);
    } catch (err) {
      toast.error('ZIP download failed');
    } finally {
      setZipProgress(null);
    }
  };

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  return (
    <div className="min-h-screen bg-background mesh-bg overflow-x-hidden">
      {/* Lightbox */}
      {lightboxOpen && lightboxImages.length > 0 && (
        <LightboxModal
          images={lightboxImages}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxOpen(false)}
        />
      )}

      {/* History sidebar */}
      <HistorySidebar open={historyOpen} onClose={() => setHistoryOpen(false)} history={history} onRemove={removeItem} onClearAll={clearAll} />

      {/* AI Integrations settings */}
      <AIIntegrationsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />

      {/* Avni AI Chat */}
      <AvniAIChat
        currentPrompt={prompt}
        onAction={handleAvniAction}
        onTriggerGenerate={handleGenerate}
      />

      {/* ── NAV ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-card border-b border-border/30 px-4 sm:px-6 py-3">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-7 h-7 studio-gradient rounded-lg flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="font-display text-base sm:text-lg font-bold text-studio">Avni Image Studio</span>
          </div>
          <div className="hidden md:flex items-center gap-5 text-xs text-muted-foreground">
            <button onClick={() => scrollTo('features')} className="hover:text-foreground transition-colors">Features</button>
            <button onClick={() => scrollTo('generator')} className="hover:text-foreground transition-colors">Studio</button>
            <button onClick={() => scrollTo('gallery')} className="hover:text-foreground transition-colors">Gallery</button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-8 h-8 rounded-lg bg-secondary/60 hover:bg-secondary border border-border/40 hover:border-primary/40 flex items-center justify-center transition-all"
              aria-label="AI Integrations"
              title="AI Integrations"
            >
              <Settings2 className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setHistoryOpen(true)}
              className="relative w-8 h-8 rounded-lg bg-secondary/60 hover:bg-secondary border border-border/40 hover:border-primary/40 flex items-center justify-center transition-all"
              aria-label="Open creation history"
            >
              <History className="w-3.5 h-3.5 text-muted-foreground" />
              {history.length > 0 && (
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 studio-gradient rounded-full text-[8px] text-white font-bold flex items-center justify-center">
                  {history.length > 9 ? '9+' : history.length}
                </span>
              )}
            </button>
            <UserMenu />
            <Button onClick={() => scrollTo('generator')} size="sm" className="studio-gradient text-white border-0 hover:opacity-90 text-xs px-3 py-1.5 h-auto hidden sm:inline-flex">
              Studio
            </Button>
          </div>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className="relative pt-24 pb-16 px-4 sm:px-6 text-center overflow-hidden">
        <div className="absolute top-16 left-1/4 w-60 h-60 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <div className="absolute top-32 right-1/4 w-48 h-48 rounded-full bg-studio-rose/12 blur-3xl pointer-events-none" />
        <div className="relative max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-1.5 glass-card rounded-full px-3 py-1.5 mb-6 text-xs text-studio-gold">
            <Star className="w-3 h-3 fill-studio-gold" />Powered by OnSpace AI
          </div>
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-[1.05] mb-4">
            <span className="text-studio">Avni</span><br /><span className="text-foreground">Image Studio</span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-studio-gold font-display italic mb-3">"Imagination is next reality"</p>
          <p className="text-muted-foreground text-sm sm:text-base max-w-xl mx-auto mb-8 leading-relaxed">
            Transform your words into breathtaking visuals. Multi-modal AI at your fingertips — generate, edit, and create stunning images in seconds.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button onClick={() => scrollTo('generator')} size="default" className="studio-gradient text-white border-0 text-sm px-6 py-2.5 rounded-xl hover:opacity-90 glow-violet">
              <Wand2 className="w-4 h-4 mr-1.5" />Start Creating<ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
            <Button onClick={() => scrollTo('gallery')} variant="outline" size="default" className="text-sm px-6 py-2.5 rounded-xl border-border hover:border-primary/50">
              <ImageIcon className="w-4 h-4 mr-1.5" />View Gallery
            </Button>
          </div>
          <button onClick={() => scrollTo('generator')} className="mt-10 flex flex-col items-center gap-1.5 mx-auto text-muted-foreground hover:text-foreground transition-colors animate-float">
            <span className="text-[10px] uppercase tracking-widest">Explore</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="features" className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-foreground mb-3">
              Everything You Need to <span className="text-studio">Create</span>
            </h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto">A complete creative suite powered by the world's most advanced AI models.</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
            <FeatureCard icon={Wand2} title="Text to Image" desc="Describe any scene and watch it come alive with stunning detail." />
            <FeatureCard icon={Layers} title="Style Presets" desc="Photorealistic, watercolor, cyberpunk, fantasy and more." />
            <FeatureCard icon={Globe} title="Any Ratio" desc="Square, landscape, portrait — every format supported." />
            <FeatureCard icon={Zap} title="Lightning Fast" desc="High-quality results in under 10 seconds." />
            <FeatureCard icon={Download} title="Instant Download" desc="Full resolution, ready to share or print." />
            <FeatureCard icon={RefreshCw} title="Unlimited Iterations" desc="Refine your prompt until you get exactly what you imagined." />
          </div>
        </div>
      </section>

      {/* ── STUDIO ── */}
      <section id="generator" className="py-16 px-4 sm:px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-2"><span className="text-studio">AI Studio</span></h2>
            <p className="text-muted-foreground text-sm">Type your vision. Watch it appear.</p>
          </div>

          <div className="glass-card rounded-2xl p-4 sm:p-6 glow-violet">
            {/* Tab switcher */}
            <div className="flex gap-1 p-1 bg-secondary/50 rounded-xl mb-5">
              <button
                onClick={() => setActiveTab('generate')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === 'generate' ? 'studio-gradient text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Sparkles className="w-3.5 h-3.5" />Generate
              </button>
              <button
                onClick={() => setActiveTab('edit')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${activeTab === 'edit' ? 'studio-gradient text-white shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Upload className="w-3.5 h-3.5" />Edit Image
              </button>
            </div>

            {/* ── GENERATE TAB ── */}
            {activeTab === 'generate' && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Your Prompt</label>
                    <InspireButton prompt={prompt} onSelect={setPrompt} />
                  </div>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="A majestic dragon soaring over misty mountains at golden hour…"
                    rows={3}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-xs sm:text-sm leading-relaxed"
                    onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate(); }}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Quick Tags</label>
                  <PromptTagBuilder prompt={prompt} onAppend={handleTagAppend} />
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Style Preset</label>
                  <div className="flex flex-wrap gap-1.5">
                    <button onClick={() => setStyle('')} className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${style === '' ? 'studio-gradient text-white' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>None</button>
                    {STYLE_PRESETS.map(s => (
                      <button key={s.value} onClick={() => setStyle(s.value)} className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${style === s.value ? 'studio-gradient text-white' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>{s.label}</button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">Aspect Ratio</label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {ASPECT_RATIOS.map(ar => (
                      <button
                        key={ar.value}
                        onClick={() => setAspectRatio(ar.value)}
                        className={`py-2 rounded-xl text-[11px] font-medium transition-all flex flex-col items-center gap-0.5 ${aspectRatio === ar.value ? 'studio-gradient text-white' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}
                      >
                        <span className="text-sm">{ar.icon}</span>{ar.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={generating || !prompt.trim()}
                  size="default"
                  className="w-full studio-gradient text-white border-0 text-sm py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50"
                >
                  {generating ? <><RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />Generating…</> : <><Sparkles className="w-4 h-4 mr-1.5" />Generate Image</>}
                </Button>

                {/* Result */}
                {generatedImage && (
                  <div className="space-y-3 animate-fadeUp">
                    <div
                      className="relative overflow-hidden rounded-xl border border-primary/30 cursor-zoom-in"
                      onClick={() => openResultLightbox(generatedImage, prompt)}
                    >
                      <img src={generatedImage} alt="Generated" className="w-full h-auto block" />
                      <div className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/50 flex items-center justify-center pointer-events-none">
                        <ImageIcon className="w-3.5 h-3.5 text-white/70" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        onClick={() => { const a = document.createElement('a'); a.href = generatedImage; a.download = 'avni-studio.png'; a.click(); }}
                        variant="outline" className="border-border hover:border-primary/50 text-xs py-2"
                      >
                        <Download className="w-3.5 h-3.5 mr-1" />Download
                      </Button>
                      <ShareButton imageUrl={generatedImage} prompt={prompt} />
                      <Button onClick={handleGenerate} variant="outline" className="border-border hover:border-primary/50 text-xs py-2" disabled={generating}>
                        <RefreshCw className="w-3.5 h-3.5 mr-1" />Again
                      </Button>
                    </div>

                    {/* Variations */}
                    <div className="pt-1">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <p className="text-xs font-semibold text-foreground">Generate Variations</p>
                          <p className="text-[10px] text-muted-foreground">3 unique takes on your prompt</p>
                        </div>
                        <Button
                          onClick={handleGenerateVariations}
                          disabled={generatingVariations}
                          size="sm"
                          className="studio-gradient text-white border-0 text-xs px-3 py-1.5 h-auto hover:opacity-90 disabled:opacity-50"
                        >
                          {generatingVariations ? <><RefreshCw className="w-3 h-3 mr-1 animate-spin" />Creating…</> : <><Sparkles className="w-3 h-3 mr-1" />Variations</>}
                        </Button>
                      </div>
                      {variations.length > 0 && (
                        <div className="grid grid-cols-3 gap-3 animate-fadeUp">
                          {variations.map(v => <VariationCard key={v.id} item={v} prompt={prompt} />)}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ── EDIT TAB ── */}
            {activeTab === 'edit' && (
              <div className="space-y-4">
                {editImagePreview ? (
                  <div className="relative rounded-xl overflow-hidden border border-border/50">
                    <img src={editImagePreview} alt="Source" className="w-full h-40 object-cover" />
                    <button
                      onClick={() => { setEditImageBase64(null); setEditImagePreview(null); setEditResult(null); }}
                      className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-black/60 hover:bg-black/80 flex items-center justify-center"
                    >
                      <X className="w-3.5 h-3.5 text-white" />
                    </button>
                    <div className="absolute bottom-2 left-2 text-[10px] bg-black/60 text-white px-2 py-0.5 rounded-md">Source image</div>
                  </div>
                ) : (
                  <EditUploadZone onImageSelected={(b64, preview) => { setEditImageBase64(b64); setEditImagePreview(preview); }} />
                )}

                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Transformation Prompt</label>
                  <textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="Turn this into a watercolor painting, add dramatic storm clouds, change to sunset…"
                    rows={3}
                    className="w-full bg-secondary/50 border border-border rounded-xl px-3 py-2.5 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 text-xs sm:text-sm leading-relaxed"
                  />
                </div>

                <Button
                  onClick={handleEditGenerate}
                  disabled={editGenerating || !editPrompt.trim() || !editImageBase64}
                  size="default"
                  className="w-full studio-gradient text-white border-0 text-sm py-2.5 rounded-xl hover:opacity-90 disabled:opacity-50"
                >
                  {editGenerating ? <><RefreshCw className="w-4 h-4 mr-1.5 animate-spin" />Editing…</> : <><Wand2 className="w-4 h-4 mr-1.5" />Edit Image</>}
                </Button>

                {/* Before/After result */}
                {editResult && editImagePreview && (
                  <div className="space-y-3 animate-fadeUp">
                    <p className="text-xs font-semibold text-foreground">Before / After Comparison</p>
                    <BeforeAfterSlider beforeUrl={editImagePreview} afterUrl={editResult} beforeLabel="Original" afterLabel="Edited" />
                    <div className="grid grid-cols-2 gap-2">
                      <Button onClick={() => { const a = document.createElement('a'); a.href = editResult; a.download = 'avni-edit.png'; a.click(); }} variant="outline" className="border-border hover:border-primary/50 text-xs py-2">
                        <Download className="w-3.5 h-3.5 mr-1" />Download
                      </Button>
                      <ShareButton imageUrl={editResult} prompt={editPrompt} />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-xs border-border/50"
                      onClick={() => openResultLightbox(editResult, editPrompt)}
                    >
                      <ImageIcon className="w-3 h-3 mr-1.5" />View Fullscreen
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── GALLERY ── */}
      <section id="gallery" className="py-16 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
              AI-Generated <span className="text-studio">Gallery</span>
            </h2>
            <p className="text-muted-foreground text-sm max-w-lg mx-auto mb-5">
              Every image was created by our AI — click to expand, hover to download.
            </p>
            {/* Download All ZIP */}
            <Button
              onClick={handleDownloadAll}
              variant="outline"
              size="sm"
              className="border-primary/30 hover:border-primary/60 text-xs px-4 py-2 h-auto"
              disabled={!!zipProgress || gallery.every(g => g.loading)}
            >
              {zipProgress ? (
                <><Package className="w-3.5 h-3.5 mr-1.5 animate-pulse" />Packing {zipProgress.packed} / {zipProgress.total}…</>
              ) : (
                <><Package className="w-3.5 h-3.5 mr-1.5" />Download All as ZIP</>
              )}
            </Button>
          </div>

          <div className="columns-1 sm:columns-2 lg:columns-3 gap-3 space-y-3">
            {gallery.map((item, i) => {
              const loadedBefore = gallery.slice(0, i).filter(g => !g.loading && g.imageUrl);
              const loadedIndex = loadedBefore.length;
              return (
                <div key={item.id} className="break-inside-avoid">
                  <GalleryCard item={item} onClick={() => openGalleryLightbox(loadedIndex)} />
                </div>
              );
            })}
            {gallery.length === 0 && (
              <div className="col-span-3 flex items-center justify-center py-20 text-muted-foreground">
                <div className="text-center space-y-2">
                  <div className="w-10 h-10 studio-gradient rounded-full mx-auto animate-pulseGlow" />
                  <p className="text-sm">Loading gallery…</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center glass-card rounded-2xl p-8 sm:p-10 glow-violet">
          <Sparkles className="w-8 h-8 text-studio-gold mx-auto mb-4 animate-float" />
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold mb-3">
            Your <span className="text-studio">Imagination</span> is the Only Limit
          </h2>
          <p className="text-muted-foreground mb-6 text-sm">Start generating stunning images today — no sign-up required.</p>
          <Button onClick={() => scrollTo('generator')} size="default" className="studio-gradient text-white border-0 text-sm px-8 py-2.5 rounded-xl hover:opacity-90">
            <Wand2 className="w-4 h-4 mr-1.5" />Create Your First Image
          </Button>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className="border-t border-border/30 py-6 px-4 sm:px-6 pb-20">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 studio-gradient rounded-md flex items-center justify-center">
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </div>
            <span className="font-display font-bold text-foreground">Avni Image Studio</span>
            <span className="italic text-studio-gold">— Imagination is next reality</span>
          </div>
          <p>Powered by OnSpace AI · Nano Banana</p>
        </div>
      </footer>
    </div>
  );
}
