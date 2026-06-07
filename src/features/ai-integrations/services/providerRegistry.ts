import type { AIProvider, ProviderCapabilities, ProviderConfig, ModelOption } from '../types/aiIntegration.types';

// ─── Model presets per provider ───────────────────────────────────────
const OPENROUTER_MODELS: ModelOption[] = [
  { id: 'google/gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image', feature: ['text_to_image'], isDefault: true, supportsImageOutput: true },
  { id: 'google/gemini-3-flash-preview', label: 'Gemini 3 Flash', feature: ['chat', 'prompt_enhance', 'inspire'], isDefault: true, supportsStreaming: true },
  { id: 'openai/gpt-image-1.5', label: 'GPT Image 1.5', feature: ['text_to_image', 'image_edit'], supportsImageInput: true, supportsImageOutput: true },
  { id: 'openai/gpt-5-mini', label: 'GPT-5 Mini', feature: ['chat', 'prompt_enhance', 'inspire'], supportsStreaming: true },
];

const OPENAI_MODELS: ModelOption[] = [
  { id: 'dall-e-3', label: 'DALL·E 3', feature: ['text_to_image'], isDefault: true, supportsImageOutput: true },
  { id: 'dall-e-2', label: 'DALL·E 2', feature: ['text_to_image', 'image_edit', 'image_to_image'], supportsImageInput: true, supportsImageOutput: true },
  { id: 'gpt-4o', label: 'GPT-4o', feature: ['chat', 'prompt_enhance', 'inspire'], isDefault: true, supportsStreaming: true, supportsImageInput: true },
  { id: 'gpt-4o-mini', label: 'GPT-4o Mini', feature: ['chat', 'prompt_enhance', 'inspire'], supportsStreaming: true },
];

const GEMINI_MODELS: ModelOption[] = [
  { id: 'gemini-2.5-flash-image', label: 'Gemini 2.5 Flash Image', feature: ['text_to_image', 'image_to_image', 'image_edit'], isDefault: true, supportsImageInput: true, supportsImageOutput: true },
  { id: 'gemini-3-pro-image-preview', label: 'Gemini 3 Pro Image', feature: ['text_to_image', 'image_edit'], supportsImageInput: true, supportsImageOutput: true },
  { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash', feature: ['chat', 'prompt_enhance', 'inspire'], isDefault: true, supportsStreaming: true },
  { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro', feature: ['chat', 'prompt_enhance'], supportsStreaming: true },
];

const HUGGINGFACE_MODELS: ModelOption[] = [
  { id: 'stabilityai/stable-diffusion-xl-base-1.0', label: 'SDXL Base 1.0', feature: ['text_to_image'], isDefault: true, supportsImageOutput: true },
  { id: 'black-forest-labs/FLUX.1-schnell', label: 'FLUX.1 Schnell', feature: ['text_to_image'], supportsImageOutput: true },
  { id: 'custom', label: 'Custom Endpoint', feature: ['text_to_image', 'image_to_image', 'image_edit'] },
];

const GROK_MODELS: ModelOption[] = [
  { id: 'grok-2-vision-1212', label: 'Grok 2 Vision', feature: ['chat', 'prompt_enhance'], isDefault: true, supportsImageInput: true },
  { id: 'grok-2-image-1212', label: 'Grok 2 Image', feature: ['text_to_image'], supportsImageOutput: true },
];

const QWEN_MODELS: ModelOption[] = [
  { id: 'qwen-vl-max', label: 'Qwen VL Max', feature: ['image_edit', 'image_to_image', 'text_to_image'], isDefault: true, supportsImageInput: true, supportsImageOutput: true },
  { id: 'qwen2.5-72b-instruct', label: 'Qwen 2.5 72B', feature: ['chat', 'prompt_enhance', 'inspire'] },
];

const COMFYUI_MODELS: ModelOption[] = [
  { id: 'workflow_t2i', label: 'Text-to-Image Workflow', feature: ['text_to_image'], isDefault: true },
  { id: 'workflow_i2i', label: 'Image-to-Image Workflow', feature: ['image_to_image', 'image_edit'] },
];

// ─── Registry ─────────────────────────────────────────────────────────
export const providerRegistry: Record<AIProvider, Partial<ProviderConfig>> = {
  openrouter: {
    provider: 'openrouter',
    label: 'OpenRouter',
    capabilities: {
      chat: true, text_to_image: true, image_to_image: false,
      image_edit: false, prompt_enhance: true, inspire: true, customEndpoint: false,
    },
    endpoints: { baseUrl: 'https://openrouter.ai/api/v1', chatPath: '/chat/completions', timeoutMs: 45000, retryCount: 1 },
    models: OPENROUTER_MODELS,
  },
  openai: {
    provider: 'openai',
    label: 'OpenAI',
    capabilities: {
      chat: true, text_to_image: true, image_to_image: true,
      image_edit: true, prompt_enhance: true, inspire: true,
    },
    endpoints: { baseUrl: 'https://api.openai.com/v1', chatPath: '/chat/completions', textToImagePath: '/images/generations', imageEditPath: '/images/edits', timeoutMs: 45000, retryCount: 1 },
    models: OPENAI_MODELS,
  },
  gemini: {
    provider: 'gemini',
    label: 'Gemini',
    capabilities: {
      chat: true, text_to_image: true, image_to_image: true,
      image_edit: true, prompt_enhance: true, inspire: true,
    },
    endpoints: { baseUrl: 'https://generativelanguage.googleapis.com', chatPath: '/v1beta/models', timeoutMs: 45000, retryCount: 1 },
    models: GEMINI_MODELS,
  },
  huggingface: {
    provider: 'huggingface',
    label: 'Hugging Face',
    capabilities: {
      chat: false, text_to_image: true, image_to_image: true,
      image_edit: true, prompt_enhance: false, inspire: false,
      customEndpoint: true, gradioSpace: true,
    },
    endpoints: { baseUrl: '', timeoutMs: 60000, retryCount: 1 },
    models: HUGGINGFACE_MODELS,
  },
  grok: {
    provider: 'grok',
    label: 'Grok',
    capabilities: {
      chat: true, text_to_image: true, image_to_image: true,
      image_edit: true, prompt_enhance: true, inspire: true,
    },
    endpoints: { baseUrl: 'https://api.x.ai/v1', chatPath: '/chat/completions', timeoutMs: 45000, retryCount: 1 },
    models: GROK_MODELS,
  },
  qwen: {
    provider: 'qwen',
    label: 'Qwen',
    capabilities: {
      chat: true, text_to_image: true, image_to_image: true,
      image_edit: true, prompt_enhance: true, inspire: true,
    },
    endpoints: { baseUrl: 'https://dashscope.aliyuncs.com/api/v1', chatPath: '/services/aigc/text-generation/generation', timeoutMs: 45000, retryCount: 1 },
    models: QWEN_MODELS,
  },
  comfyui: {
    provider: 'comfyui',
    label: 'ComfyUI',
    capabilities: {
      chat: false, text_to_image: true, image_to_image: true,
      image_edit: true, prompt_enhance: false, inspire: false,
      customEndpoint: true, selfHosted: true,
    },
    endpoints: {
      baseUrl: '', textToImagePath: '/prompt', imageEditPath: '/prompt',
      imageToImagePath: '/prompt', healthPath: '/system_stats',
      timeoutMs: 120000, retryCount: 0,
    },
    models: COMFYUI_MODELS,
  },
  onspace: {
    provider: 'onspace',
    label: 'OnSpace AI (Built-in)',
    capabilities: {
      chat: true, text_to_image: true, image_to_image: false,
      image_edit: true, prompt_enhance: true, inspire: true,
    },
    endpoints: {},
    models: [],
  },
};

export const PROVIDER_DESCRIPTIONS: Record<AIProvider, string> = {
  openrouter: 'Unified API gateway to 100+ models. Best for multi-model routing and fallback.',
  openai: 'Industry standard for image generation (DALL·E) and GPT-based chat and prompts.',
  gemini: 'Google\'s default chat and image generation provider. Powers Avni AI assistant.',
  huggingface: 'Self-hosted or Gradio Spaces for open-source models like SDXL and FLUX.',
  grok: 'X AI\'s Grok models for vision, chat, and image generation.',
  qwen: 'Alibaba\'s Qwen models — strong image edit fallback in the default editing chain.',
  comfyui: 'Self-hosted ComfyUI workflows for fully custom T2I/I2I pipelines.',
  onspace: 'OnSpace built-in AI (uses OnSpace credits). Used as optional last-resort fallback.',
};

export const PROVIDER_ICONS: Record<AIProvider, string> = {
  openrouter: '🔀', openai: '✦', gemini: '◆',
  huggingface: '🤗', grok: '𝕏', qwen: '⚡', comfyui: '🖥', onspace: '🚀',
};

export const CAPABILITY_LABELS: Record<keyof ProviderCapabilities, string> = {
  chat: 'Chat / Assistant',
  text_to_image: 'Text → Image',
  image_to_image: 'Image → Image',
  image_edit: 'Image Editing',
  prompt_enhance: 'Prompt Enhance',
  inspire: 'Inspire Prompts',
  customEndpoint: 'Custom Endpoint',
  selfHosted: 'Self-Hosted',
  gradioSpace: 'Gradio Space',
};

export const FEATURE_LABELS: Record<AIFeature, string> = {
  chat: 'Chat / Assistant',
  text_to_image: 'Text → Image',
  image_to_image: 'Image → Image',
  image_edit: 'Image Editing',
  prompt_enhance: 'Prompt Enhancement',
  inspire: 'Inspire Prompts',
};
