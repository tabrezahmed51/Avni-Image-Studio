/**
 * useImageStore — Zustand global store for active image, filters, and undo/redo history.
 * Max 15 history steps. Used by the editor to prevent prop drilling.
 */
import { create } from 'zustand';

const MAX_HISTORY = 15;

export interface FilterLayer {
  id: string;
  type: 'grayscale' | 'brightness' | 'contrast' | 'blur' | 'sepia' | 'invert' | 'hue-rotate' | 'saturate';
  value: number; // 0-200 for most, 0-360 for hue-rotate
  label: string;
}

export interface ImageSnapshot {
  url: string | null;
  filters: FilterLayer[];
}

interface ImageStore {
  // Active image
  activeUrl: string | null;
  activeFile: File | null;
  // Filters/layers currently applied
  filters: FilterLayer[];
  // Undo/redo history
  history: ImageSnapshot[];
  historyIndex: number;

  // Derived (computed)
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Actions
  setActiveImage: (url: string | null, file?: File | null) => void;
  applyFilter: (filter: FilterLayer) => void;
  removeFilter: (filterId: string) => void;
  updateFilterValue: (filterId: string, value: number) => void;
  clearFilters: () => void;
  undo: () => void;
  redo: () => void;
  _pushHistory: (snapshot: ImageSnapshot) => void;
  reset: () => void;
}

export const useImageStore = create<ImageStore>((set, get) => ({
  activeUrl: null,
  activeFile: null,
  filters: [],
  history: [],
  historyIndex: -1,

  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1,

  _pushHistory: (snapshot) => {
    set((state) => {
      // Truncate forward history when pushing new snapshot
      const truncated = state.history.slice(0, state.historyIndex + 1);
      const next = [...truncated, snapshot].slice(-MAX_HISTORY);
      return { history: next, historyIndex: next.length - 1 };
    });
  },

  setActiveImage: (url, file = null) => {
    const snapshot: ImageSnapshot = { url, filters: [] };
    get()._pushHistory(snapshot);
    set({ activeUrl: url, activeFile: file ?? null, filters: [] });
  },

  applyFilter: (filter) => {
    set((state) => {
      // Replace if same type exists, else append
      const existing = state.filters.findIndex(f => f.id === filter.id);
      const next = existing >= 0
        ? state.filters.map(f => f.id === filter.id ? filter : f)
        : [...state.filters, filter];
      const snapshot: ImageSnapshot = { url: state.activeUrl, filters: next };
      return { filters: next };
    });
    const s = get();
    get()._pushHistory({ url: s.activeUrl, filters: s.filters });
  },

  removeFilter: (filterId) => {
    set((state) => {
      const next = state.filters.filter(f => f.id !== filterId);
      return { filters: next };
    });
    const s = get();
    get()._pushHistory({ url: s.activeUrl, filters: s.filters });
  },

  updateFilterValue: (filterId, value) => {
    set((state) => ({
      filters: state.filters.map(f => f.id === filterId ? { ...f, value } : f),
    }));
  },

  clearFilters: () => {
    set((state) => {
      get()._pushHistory({ url: state.activeUrl, filters: [] });
      return { filters: [] };
    });
  },

  undo: () => {
    set((state) => {
      if (state.historyIndex <= 0) return state;
      const idx = state.historyIndex - 1;
      const snap = state.history[idx];
      return { historyIndex: idx, activeUrl: snap.url, filters: snap.filters };
    });
  },

  redo: () => {
    set((state) => {
      if (state.historyIndex >= state.history.length - 1) return state;
      const idx = state.historyIndex + 1;
      const snap = state.history[idx];
      return { historyIndex: idx, activeUrl: snap.url, filters: snap.filters };
    });
  },

  reset: () => set({ activeUrl: null, activeFile: null, filters: [], history: [], historyIndex: -1 }),
}));

// ─── CSS filter string builder (used in <img style={{ filter: ... }}>) ──
export function buildCSSFilter(filters: FilterLayer[]): string {
  if (!filters.length) return '';
  return filters.map(f => {
    switch (f.type) {
      case 'grayscale': return `grayscale(${f.value}%)`;
      case 'brightness': return `brightness(${f.value}%)`;
      case 'contrast': return `contrast(${f.value}%)`;
      case 'blur': return `blur(${f.value}px)`;
      case 'sepia': return `sepia(${f.value}%)`;
      case 'invert': return `invert(${f.value}%)`;
      case 'hue-rotate': return `hue-rotate(${f.value}deg)`;
      case 'saturate': return `saturate(${f.value}%)`;
      default: return '';
    }
  }).join(' ');
}
