import { useState, useRef, useEffect, useCallback } from 'react';
import {
  X, Send, Sparkles, Bot, User, Loader2, ChevronDown, Wand2,
  Zap, Settings, Info, AlertTriangle, CheckCircle2, Brain,
} from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { chatViaProvider, hasConfiguredExternalProvider } from '@/lib/providerApi';
import { callAvniChatOnSpace } from '@/lib/api';
import { getAIIntegrationState } from '@/features/ai-integrations/store/aiIntegrationStore';
import { useAIIntegrationStore } from '@/features/ai-integrations/store/aiIntegrationStore';
import { toast } from 'sonner';

export interface AvniAction {
  type: 'fill_prompt' | 'navigate' | 'set_style' | 'set_aspect_ratio' | 'open_history' | 'switch_tab' | 'open_settings' | 'trigger_generate';
  payload: string | boolean;
}

interface AvniAIChatProps {
  currentPrompt: string;
  onAction: (action: AvniAction) => void;
  onTriggerGenerate?: () => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  action?: AvniAction | null;
  provider?: string;
}

const QUICK_PROMPTS = [
  'Help me write a cinematic prompt',
  'What providers are configured?',
  'Suggest a fantasy scene',
  'Take me to the Studio',
  'How do I edit an image?',
];

const SYSTEM_PROMPT_TEMPLATE = (stateJson: string, currentPrompt: string) => `You are Avni, the intelligent AI assistant and agentic controller of Avni Image Studio.

== YOUR ROLE ==
You are fully agentic. You understand the app state, which providers are configured, what features are available, and you actively guide users to create stunning images.

== CURRENT APP STATE ==
${stateJson}

== CURRENT PROMPT IN STUDIO ==
${currentPrompt || '(empty)'}

== APP SECTIONS ==
- Hero: Top landing area
- Features (id: features): 6 capability cards
- AI Studio (id: generator): Main creation panel with Generate and Edit Image tabs
  • Generate tab: Prompt → Inspire Me → Quick Tags → Style Presets → Aspect Ratio → Generate
  • Edit Image tab: Upload image → Transformation prompt → Edit → Before/After comparison
- Gallery (id: gallery): AI-generated images with lightbox and ZIP download
- History sidebar: All past generations with search, sort, filter
- Settings (gear icon): AI Integrations modal with 7 providers + Studio Control Mode

== ACTIONS YOU CAN TRIGGER ==
Return a JSON action alongside your message:
{
  "message": "Your response",
  "action": null | {
    "type": "fill_prompt" | "navigate" | "set_style" | "set_aspect_ratio" | "open_history" | "switch_tab" | "open_settings" | "trigger_generate",
    "payload": <value>
  }
}

Action types:
- fill_prompt: payload = rich prompt text
- navigate: payload = "generator" | "gallery" | "features" | "top"
- set_style: payload = "" | "photorealistic, 8K ultra HD, hyperrealistic" | "digital art, vibrant, concept art, artstation" | "watercolor painting, soft edges, artistic" | "cyberpunk, neon lights, futuristic, dark atmosphere" | "fantasy art, magical, epic, detailed illustration" | "minimalist, clean, simple, elegant, modern"
- set_aspect_ratio: payload = "1:1" | "16:9" | "9:16" | "4:3"
- open_history: payload = true
- switch_tab: payload = "generate" | "edit"
- open_settings: payload = true (opens AI Integrations modal)
- trigger_generate: payload = true (triggers image generation with current prompt)

== STUDIO CONTROL MODE BEHAVIOR ==
- fully_agentic: Auto-select and trigger actions without asking for confirmation
- half_manual: Suggest actions but ask user to confirm before triggering
- fully_manual: Give guidance only — never trigger actions automatically

== PROVIDER GUIDANCE ==
If a provider shows "not_configured" or no API key, tell the user to:
1. Click the gear icon ⚙ in the top-right
2. Go to AI Integrations tab
3. Enter their API key for that provider
4. Click Test Connection
5. Save Settings

== GUIDELINES ==
- Be concise, helpful, and creative
- If user asks for a prompt, craft vivid detailed prompts and use fill_prompt
- If user asks why generation fails, explain provider configuration
- If no providers configured and no OnSpace fallback, suggest opening settings
- ALWAYS return valid JSON with both "message" and "action" keys
- The "action" field must be null if no action is needed`;

async function callAvniChatViaProvider(
  messages: { role: string; content: string }[],
  currentPrompt: string
): Promise<{ message: string; action: AvniAction | null; provider?: string }> {
  const state = getAIIntegrationState();

  // Build context-aware system prompt
  const stateContext = JSON.stringify({
    studioControlMode: state.studioControlMode,
    onspaceAsFallback: state.onspaceAsFallback,
    activeBotProvider: state.activeBotProvider,
    providers: Object.fromEntries(
      Object.entries(state.providers)
        .filter(([k]) => k !== 'onspace')
        .map(([k, v]) => [k, {
          enabled: v.settings.enabled,
          status: v.settings.status,
          hasKey: Boolean(v.auth?.apiKey),
        }])
    ),
    generationFallback: state.globalDefaults.generationFallback,
    editingFallback: state.globalDefaults.editingFallback,
  }, null, 2);

  const systemPrompt = SYSTEM_PROMPT_TEMPLATE(stateContext, currentPrompt);

  // 1. Try external provider
  if (hasConfiguredExternalProvider('chat')) {
    console.log('[AvniAI] Routing chat to external provider');
    try {
      const result = await chatViaProvider(messages, systemPrompt);
      if (result) {
        console.log(`[AvniAI] Chat response via: ${result.provider}`);
        // Try to parse as JSON action response
        try {
          const trimmed = result.text.trim();
          let parsed;
          try {
            parsed = JSON.parse(trimmed);
          } catch {
            const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              parsed = JSON.parse(jsonMatch[0]);
            } else {
              throw new Error("No JSON object found");
            }
          }
          if (parsed && typeof parsed === 'object') {
            // Action payload shape validation
            let action: AvniAction | null = null;
            if (parsed.action && typeof parsed.action === 'object' && parsed.action.type) {
              const actionType = parsed.action.type;
              const allowedTypes = ['fill_prompt', 'navigate', 'set_style', 'set_aspect_ratio', 'open_history', 'switch_tab', 'open_settings', 'trigger_generate'];
              if (allowedTypes.includes(actionType)) {
                action = {
                  type: actionType,
                  payload: typeof parsed.action.payload === 'object' && parsed.action.payload !== null
                    ? JSON.stringify(parsed.action.payload)
                    : parsed.action.payload
                };
              }
            }
            return {
              message: parsed.message || result.text,
              action,
              provider: result.provider
            };
          }
        } catch {
          // Plain text response — wrap it
          return { message: result.text, action: null, provider: result.provider };
        }
      }
    } catch (err) {
      console.warn('[AvniAI] External chat failed:', err instanceof Error ? err.message : err);
    }
  }

  // 2. OnSpace fallback
  if (state.onspaceAsFallback) {
    console.log('[AvniAI] Falling back to OnSpace AI for chat');
    const result = await callAvniChatOnSpace(messages, currentPrompt);
    return { ...(result as { message: string; action: AvniAction | null }), provider: 'onspace' };
  }

  // 3. No provider configured
  return {
    message: "I need an AI provider to function. Please open **Settings** (⚙ gear icon) → AI Integrations and add a Gemini or OpenRouter API key, then save. Once connected, I can fully assist you!",
    action: { type: 'open_settings', payload: true },
    provider: 'none',
  };
}

export default function AvniAIChat({ currentPrompt, onAction, onTriggerGenerate }: AvniAIChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm **Avni**, your agentic AI studio assistant. I can craft prompts, navigate the app, configure providers, and even trigger image generation. What would you like to create?",
      action: null,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastReadMessageCount, setLastReadMessageCount] = useState(1);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { state } = useAIIntegrationStore();

  // Determine provider status for indicator
  const chatProvider = hasConfiguredExternalProvider('chat')
    ? state.globalDefaults.chatDefault
    : (state.onspaceAsFallback ? 'onspace' : null);
  const providerLabel = chatProvider
    ? (state.providers[chatProvider]?.label ?? chatProvider)
    : 'No provider';
  const isReady = chatProvider !== null;

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  useEffect(() => {
    if (open) {
      setLastReadMessageCount(messages.length);
    }
  }, [open, messages.length]);

  const handleAction = useCallback((action: AvniAction) => {
    switch (action.type) {
      case 'open_settings':
        onAction({ type: 'open_settings' as AvniAction['type'], payload: true });
        break;
      case 'trigger_generate':
        if (state.studioControlMode === 'fully_agentic') {
          onTriggerGenerate?.();
        } else if (state.studioControlMode === 'half_manual') {
          toast.info('Avni wants to generate — click Generate to confirm.');
          onAction({ type: 'navigate', payload: 'generator' });
        }
        // fully_manual: no auto action
        break;
      default:
        onAction(action);
    }
  }, [state.studioControlMode, onAction, onTriggerGenerate]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const result = await callAvniChatViaProvider(history, currentPrompt);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: result.message || 'Done!',
        action: (result.action as AvniAction) || null,
        provider: result.provider,
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (result.action) {
        const action = result.action as AvniAction;
        // Respect control mode
        if (state.studioControlMode === 'fully_manual' && action.type !== 'open_settings') {
          // In fully manual mode: suggest but don't auto-trigger
          toast.info(`Avni suggests: ${action.type.replace(/_/g, ' ')} — apply manually from the controls.`);
        } else {
          handleAction(action);
          const successMsgs: Partial<Record<AvniAction['type'], string>> = {
            fill_prompt: 'Prompt filled in Studio!',
            navigate: `Navigating to ${action.payload}…`,
            open_settings: 'Opening AI Integrations settings…',
            trigger_generate: 'Triggering image generation…',
          };
          if (successMsgs[action.type]) toast.success(successMsgs[action.type]);
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Something went wrong: ${err instanceof Error ? err.message : 'Unknown error'}. Try opening Settings to check your provider configuration.`,
        action: { type: 'open_settings', payload: true },
      }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, currentPrompt, state.studioControlMode, handleAction]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  const renderContent = (text: string) => {
    return text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
      i % 2 === 1 ? <strong key={i} className="font-semibold text-primary/90">{part}</strong> : part
    );
  };

  const controlModeColors: Record<string, string> = {
    fully_agentic: 'text-emerald-400',
    half_manual: 'text-amber-400',
    fully_manual: 'text-sky-400',
  };

  const controlModeLabels: Record<string, string> = {
    fully_agentic: 'Fully Agentic',
    half_manual: 'Half Manual',
    fully_manual: 'Fully Manual',
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-50 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 studio-gradient ${open ? 'rotate-180 scale-95' : 'hover:scale-105 hover:shadow-[0_0_30px_rgba(147,80,230,0.6)]'}`}
        style={{ width: 52, height: 52 }}
        aria-label="Open Avni AI"
      >
        {open ? <ChevronDown className="w-5 h-5 text-white" /> : <Brain className="w-5 h-5 text-white" />}
      </button>

      {/* Unread dot */}
      {!open && messages.length > lastReadMessageCount && (
        <div className="fixed bottom-[66px] right-5 z-50 w-3 h-3 rounded-full bg-studio-gold border-2 border-background animate-pulse" />
      )}

      {/* Chat panel */}
      <div
        className={`fixed bottom-[70px] right-4 z-50 w-[340px] sm:w-[390px] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-border/40 transition-all duration-300 origin-bottom-right
          ${open ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-90 opacity-0 pointer-events-none'}`}
        style={{ maxHeight: '560px', background: 'hsl(240, 12%, 7%)', backdropFilter: 'blur(16px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 flex-shrink-0 studio-gradient">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
              <Brain className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Avni AI Agent</p>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] ${controlModeColors[state.studioControlMode]}`}>
                  {controlModeLabels[state.studioControlMode]}
                </span>
                <span className="text-white/30 text-[10px]">·</span>
                <span className="text-[10px] text-white/60">{providerLabel}</span>
                {isReady ? <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" /> : <AlertTriangle className="w-2.5 h-2.5 text-amber-400" />}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onAction({ type: 'open_settings' as AvniAction['type'], payload: true })}
              className="w-6 h-6 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
              title="AI Integrations Settings"
            >
              <Settings className="w-3 h-3 text-white/70" />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="w-6 h-6 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
            >
              <X className="w-3 h-3 text-white" />
            </button>
          </div>
        </div>

        {/* Provider status banner (if not ready) */}
        {!isReady && (
          <div className="flex items-start gap-2 px-3 py-2 bg-amber-500/10 border-b border-amber-500/20 flex-shrink-0">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-[10px] text-amber-300/90 leading-relaxed">
              No AI provider configured. <button onClick={() => onAction({ type: 'open_settings' as AvniAction['type'], payload: true })} className="underline hover:text-amber-200">Open Settings</button> to add your Gemini or OpenRouter API key.
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-0">
          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div className={`w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5
                ${msg.role === 'user' ? 'bg-primary/20' : 'studio-gradient'}`}>
                {msg.role === 'user'
                  ? <User className="w-3 h-3 text-primary" />
                  : <Bot className="w-3 h-3 text-white" />
                }
              </div>
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs leading-relaxed
                ${msg.role === 'user'
                  ? 'bg-primary/20 text-foreground rounded-tr-sm'
                  : 'bg-secondary/70 text-foreground/90 rounded-tl-sm border border-border/30'}`}>
                {renderContent(msg.content)}
                {msg.action && (
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-primary/70">
                    <Zap className="w-2.5 h-2.5" />
                    <span>Action: {msg.action.type.replace(/_/g, ' ')}</span>
                  </div>
                )}
                {msg.provider && msg.provider !== 'none' && (
                  <div className="mt-1 text-[9px] text-muted-foreground/40">via {msg.provider}</div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-2">
              <div className="w-6 h-6 rounded-full studio-gradient flex-shrink-0 flex items-center justify-center">
                <Bot className="w-3 h-3 text-white" />
              </div>
              <div className="bg-secondary/70 border border-border/30 rounded-2xl rounded-tl-sm px-3 py-2.5 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
                <span className="text-xs text-muted-foreground">Thinking…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        {messages.length <= 1 && (
          <div className="px-3 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                onClick={() => sendMessage(q)}
                className="text-[10px] px-2 py-1 rounded-lg bg-secondary/60 hover:bg-primary/15 border border-border/30 hover:border-primary/30 text-muted-foreground hover:text-foreground transition-all"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="flex items-end gap-2 px-3 py-3 border-t border-border/40 flex-shrink-0">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask Avni anything…"
            rows={1}
            className="flex-1 bg-secondary/50 border border-border/50 rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground/60 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 leading-relaxed"
            style={{ maxHeight: 80 }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || loading}
            className="w-8 h-8 rounded-xl studio-gradient flex items-center justify-center flex-shrink-0 hover:opacity-90 disabled:opacity-40 transition-all"
          >
            <Send className="w-3.5 h-3.5 text-white" />
          </button>
        </div>
      </div>
    </>
  );
}
