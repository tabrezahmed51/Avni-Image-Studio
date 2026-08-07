/**
 * useComputeProviderStore — toggles between:
 *   'cloud'  → Supabase Edge Functions (OnSpace AI backend)
 *   'local'  → Local Ollama instance (http://localhost:11434)
 *   'ollama_cloud' → Ollama Cloud API
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { testOllamaConnection } from '@/lib/ollamaClient';

export type ComputeMode = 'cloud' | 'local' | 'ollama_cloud';

interface ComputeProviderState {
  mode: ComputeMode;
  localUrl: string;
  localModel: string;
  cloudApiKey: string;
  cloudModel: string;
  isLocalReachable: boolean | null;
  isChecking: boolean;

  setMode: (mode: ComputeMode) => void;
  setLocalUrl: (url: string) => void;
  setLocalModel: (model: string) => void;
  setCloudApiKey: (key: string) => void;
  setCloudModel: (model: string) => void;
  checkLocalConnection: () => Promise<boolean>;
}

export const useComputeProviderStore = create<ComputeProviderState>()(
  persist(
    (set, get) => ({
      mode: 'cloud',
      localUrl: 'http://localhost:11434',
      localModel: 'llava',
      cloudApiKey: '',
      cloudModel: 'llava',
      isLocalReachable: null,
      isChecking: false,

      setMode: (mode) => set({ mode }),
      setLocalUrl: (localUrl) => set({ localUrl, isLocalReachable: null }),
      setLocalModel: (localModel) => set({ localModel }),
      setCloudApiKey: (cloudApiKey) => set({ cloudApiKey }),
      setCloudModel: (cloudModel) => set({ cloudModel }),

      checkLocalConnection: async () => {
        set({ isChecking: true });
        const { localUrl, cloudApiKey, mode } = get();
        const isCloud = mode === 'ollama_cloud';
        const result = await testOllamaConnection({
          baseUrl: localUrl,
          apiKey: isCloud ? cloudApiKey : undefined,
          isCloud,
        });
        set({ isLocalReachable: result.ok, isChecking: false });
        return result.ok;
      },
    }),
    { name: 'avni-compute-provider-v1' }
  )
);

// ─── Helper: get config outside React ────────────────────────────────
export function getComputeProviderState() {
  return useComputeProviderStore.getState();
}
