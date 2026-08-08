import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AIIntegrationState, AIIntegrationAction, AIProvider,
} from '../types/aiIntegration.types';
import { providerRegistry } from '../services/providerRegistry';

// ─── Default state ────────────────────────────────────────────────────
export const defaultAIIntegrationState: AIIntegrationState = {
  activeBotProvider: 'gemini',
  studioControlMode: 'half_manual',
  globalDefaults: {
    generationFallback: ['openrouter', 'gemini', 'openai'],
    editingFallback: ['openrouter', 'gemini', 'qwen'],
    chatDefault: 'gemini',
  },
  advancedSettings: {
    maxFallbackAttempts: 3,
    streamChatResponses: false,
    imageUploadStrategy: 'base64',
    debugMode: false,
  },
  providers: {
    openrouter: {
      ...providerRegistry.openrouter,
      provider: 'openrouter', label: 'OpenRouter',
      auth: { apiKey: '' },
      settings: { enabled: true, preferredModelByFeature: {}, fallbackPriorityByFeature: {}, status: 'not_configured' },
    } as AIIntegrationState['providers']['openrouter'],
    openai: {
      ...providerRegistry.openai,
      provider: 'openai', label: 'OpenAI',
      auth: { apiKey: '' },
      settings: { enabled: false, preferredModelByFeature: {}, fallbackPriorityByFeature: {}, status: 'not_configured' },
    } as AIIntegrationState['providers']['openai'],
    gemini: {
      ...providerRegistry.gemini,
      provider: 'gemini', label: 'Gemini',
      auth: { apiKey: '' },
      settings: { enabled: true, preferredModelByFeature: {}, fallbackPriorityByFeature: {}, status: 'not_configured' },
    } as AIIntegrationState['providers']['gemini'],
    huggingface: {
      ...providerRegistry.huggingface,
      provider: 'huggingface', label: 'Hugging Face',
      auth: { apiKey: '' },
      settings: { enabled: false, preferredModelByFeature: {}, fallbackPriorityByFeature: {}, status: 'not_configured' },
    } as AIIntegrationState['providers']['huggingface'],
    grok: {
      ...providerRegistry.grok,
      provider: 'grok', label: 'Grok',
      auth: { apiKey: '' },
      endpoints: { ...(providerRegistry.grok?.endpoints ?? {}), baseUrl: 'https://api.x.ai/v1' },
      settings: { enabled: false, preferredModelByFeature: {}, fallbackPriorityByFeature: {}, status: 'not_configured' },
    } as AIIntegrationState['providers']['grok'],
    qwen: {
      ...providerRegistry.qwen,
      provider: 'qwen', label: 'Qwen',
      auth: { apiKey: '' },
      endpoints: { ...(providerRegistry.qwen?.endpoints ?? {}), baseUrl: 'https://dashscope.aliyuncs.com/api/v1' },
      settings: { enabled: true, preferredModelByFeature: {}, fallbackPriorityByFeature: {}, status: 'not_configured' },
    } as AIIntegrationState['providers']['qwen'],
    comfyui: {
      ...providerRegistry.comfyui,
      provider: 'comfyui', label: 'ComfyUI',
      auth: { apiKey: '' },
      settings: { enabled: false, preferredModelByFeature: {}, fallbackPriorityByFeature: {}, status: 'not_configured' },
    } as AIIntegrationState['providers']['comfyui'],

  },
};

// ─── Reducer ──────────────────────────────────────────────────────────
function reducer(state: AIIntegrationState, action: AIIntegrationAction): AIIntegrationState {
  switch (action.type) {
    case 'SET_PROVIDER_ENABLED':
      return {
        ...state,
        providers: {
          ...state.providers,
          [action.provider]: {
            ...state.providers[action.provider],
            settings: { ...state.providers[action.provider].settings, enabled: action.enabled },
          },
        },
      };
    case 'SET_PROVIDER_AUTH':
      return {
        ...state,
        providers: {
          ...state.providers,
          [action.provider]: {
            ...state.providers[action.provider],
            auth: { ...state.providers[action.provider].auth, ...action.auth },
          },
        },
      };
    case 'SET_PROVIDER_ENDPOINTS':
      return {
        ...state,
        providers: {
          ...state.providers,
          [action.provider]: {
            ...state.providers[action.provider],
            endpoints: { ...state.providers[action.provider].endpoints, ...action.endpoints },
          },
        },
      };
    case 'SET_PROVIDER_MODEL':
      return {
        ...state,
        providers: {
          ...state.providers,
          [action.provider]: {
            ...state.providers[action.provider],
            settings: {
              ...state.providers[action.provider].settings,
              preferredModelByFeature: {
                ...state.providers[action.provider].settings.preferredModelByFeature,
                [action.feature]: action.modelId,
              },
            },
          },
        },
      };
    case 'SET_GLOBAL_FALLBACK':
      return {
        ...state,
        globalDefaults: { ...state.globalDefaults, [action.key]: action.chain },
      };
    case 'SET_PROVIDER_STATUS':
      return {
        ...state,
        providers: {
          ...state.providers,
          [action.provider]: {
            ...state.providers[action.provider],
            settings: {
              ...state.providers[action.provider].settings,
              status: action.status,
              ...(action.error !== undefined ? { lastError: action.error } : {}),
              ...(action.status === 'connected' ? { lastTestedAt: new Date().toISOString(), lastError: undefined } : {}),
            },
          },
        },
      };
    case 'SET_ACTIVE_BOT_PROVIDER':
      return {
        ...state,
        activeBotProvider: action.provider,
        globalDefaults: { ...state.globalDefaults, chatDefault: action.provider },
      };
    case 'SET_ADVANCED':
      return {
        ...state,
        advancedSettings: { ...state.advancedSettings, ...action.settings },
      };
    case 'SET_STUDIO_CONTROL_MODE':
      return { ...state, studioControlMode: action.mode };

    case 'HYDRATE_SETTINGS':
      return action.payload;
    default:
      return state;
  }
}

// ─── Zustand store ────────────────────────────────────────────────────
interface AIIntegrationStore {
  state: AIIntegrationState;
  dispatch: (action: AIIntegrationAction) => void;
  reset: () => void;
}

export const useAIIntegrationStore = create<AIIntegrationStore>()(
  persist(
    (set) => ({
      state: defaultAIIntegrationState,
      dispatch: (action) =>
        set((store) => ({ state: reducer(store.state, action) })),
      reset: () =>
        set(() => ({ state: defaultAIIntegrationState })),
    }),
    {
      name: 'avni-ai-integrations-v2',
      partialize: (s) => ({ state: s.state }),
    }
  )
);

// ─── Helper: get store state outside React (for api.ts) ───────────────
export function getAIIntegrationState(): AIIntegrationState {
  return useAIIntegrationStore.getState().state;
}
