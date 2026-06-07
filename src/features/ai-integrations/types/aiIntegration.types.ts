// ─── Provider & Feature Enums ────────────────────────────────────────
export type AIProvider =
  | 'openrouter'
  | 'openai'
  | 'gemini'
  | 'huggingface'
  | 'grok'
  | 'qwen'
  | 'comfyui'
  | 'onspace';

export type AIFeature =
  | 'chat'
  | 'text_to_image'
  | 'image_to_image'
  | 'image_edit'
  | 'prompt_enhance'
  | 'inspire';

export type ProviderStatus =
  | 'connected'
  | 'invalid_key'
  | 'not_configured'
  | 'rate_limited'
  | 'offline'
  | 'testing';

export type StudioControlMode = 'fully_agentic' | 'half_manual' | 'fully_manual';

// ─── Model ───────────────────────────────────────────────────────────
export interface ModelOption {
  id: string;
  label: string;
  feature: AIFeature[];
  supportsStreaming?: boolean;
  supportsImageInput?: boolean;
  supportsImageOutput?: boolean;
  isDefault?: boolean;
}

// ─── Capabilities ─────────────────────────────────────────────────────
export interface ProviderCapabilities {
  chat: boolean;
  text_to_image: boolean;
  image_to_image: boolean;
  image_edit: boolean;
  prompt_enhance: boolean;
  inspire: boolean;
  customEndpoint?: boolean;
  selfHosted?: boolean;
  gradioSpace?: boolean;
}

// ─── Auth ────────────────────────────────────────────────────────────
export interface ProviderAuthConfig {
  apiKey?: string;
  apiKeyHeader?: string;
  organizationId?: string;
  projectId?: string;
}

// ─── Endpoints ───────────────────────────────────────────────────────
export interface ProviderEndpointConfig {
  baseUrl?: string;
  chatPath?: string;
  textToImagePath?: string;
  imageEditPath?: string;
  imageToImagePath?: string;
  modelsPath?: string;
  healthPath?: string;
  timeoutMs?: number;
  retryCount?: number;
}

// ─── User Settings per Provider ──────────────────────────────────────
export interface ProviderUserSettings {
  enabled: boolean;
  preferredModelByFeature: Partial<Record<AIFeature, string>>;
  fallbackPriorityByFeature: Partial<Record<AIFeature, AIProvider[]>>;
  status: ProviderStatus;
  lastTestedAt?: string;
  lastError?: string;
}

// ─── Full Provider Config ─────────────────────────────────────────────
export interface ProviderConfig {
  provider: AIProvider;
  label: string;
  auth: ProviderAuthConfig;
  endpoints: ProviderEndpointConfig;
  capabilities: ProviderCapabilities;
  models: ModelOption[];
  settings: ProviderUserSettings;
}

// ─── Global State ─────────────────────────────────────────────────────
export interface AIIntegrationState {
  activeBotProvider: AIProvider;
  studioControlMode: StudioControlMode;
  onspaceAsFallback: boolean; // If true, OnSpace AI is used as last-resort fallback
  providers: Record<AIProvider, ProviderConfig>;
  globalDefaults: {
    generationFallback: AIProvider[];
    editingFallback: AIProvider[];
    chatDefault: AIProvider;
  };
  advancedSettings: {
    maxFallbackAttempts: number;
    streamChatResponses: boolean;
    imageUploadStrategy: 'base64' | 'url' | 'direct';
    debugMode: boolean;
  };
}

// ─── Reducer Actions ──────────────────────────────────────────────────
export type AIIntegrationAction =
  | { type: 'SET_PROVIDER_ENABLED'; provider: AIProvider; enabled: boolean }
  | { type: 'SET_PROVIDER_AUTH'; provider: AIProvider; auth: Partial<ProviderAuthConfig> }
  | { type: 'SET_PROVIDER_ENDPOINTS'; provider: AIProvider; endpoints: Partial<ProviderEndpointConfig> }
  | { type: 'SET_PROVIDER_MODEL'; provider: AIProvider; feature: AIFeature; modelId: string }
  | { type: 'SET_FALLBACK_CHAIN'; feature: AIFeature; chain: AIProvider[] }
  | { type: 'SET_GLOBAL_FALLBACK'; key: 'generationFallback' | 'editingFallback'; chain: AIProvider[] }
  | { type: 'SET_PROVIDER_STATUS'; provider: AIProvider; status: ProviderStatus; error?: string }
  | { type: 'SET_ACTIVE_BOT_PROVIDER'; provider: AIProvider }
  | { type: 'SET_ADVANCED'; settings: Partial<AIIntegrationState['advancedSettings']> }
  | { type: 'SET_STUDIO_CONTROL_MODE'; mode: StudioControlMode }
  | { type: 'SET_ONSPACE_FALLBACK'; enabled: boolean }
  | { type: 'HYDRATE_SETTINGS'; payload: AIIntegrationState };

// ─── Route Request / Response ─────────────────────────────────────────
export interface AIRouteRequest {
  feature: AIFeature;
  prompt?: string;
  negativePrompt?: string;
  image?: File | string;
  mask?: File | string;
  aspectRatio?: string;
  stylePreset?: string;
  userSelectedProvider?: AIProvider;
  userSelectedModel?: string;
  metadata?: Record<string, unknown>;
}

export interface AIRouteResponse {
  provider: AIProvider;
  model: string;
  output: unknown;
  usedFallback: boolean;
  error?: string;
  imageUrl?: string;
  text?: string;
}

// ─── Provider Client Interface ────────────────────────────────────────
export interface ProviderClient {
  testConnection(): Promise<{ ok: boolean; error?: string }>;
  listModels?(feature?: AIFeature): Promise<ModelOption[]>;
  generateTextToImage?(req: AIRouteRequest): Promise<AIRouteResponse>;
  generateImageEdit?(req: AIRouteRequest): Promise<AIRouteResponse>;
  generateImageToImage?(req: AIRouteRequest): Promise<AIRouteResponse>;
  chat?(req: AIRouteRequest): Promise<AIRouteResponse>;
}

// ─── Validation ───────────────────────────────────────────────────────
export interface ValidationResult {
  valid: boolean;
  errors: string[];
}
