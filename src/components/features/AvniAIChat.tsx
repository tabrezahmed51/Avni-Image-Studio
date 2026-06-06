import { useState, useRef, useEffect, useCallback } from 'react';
import { X, Send, Sparkles, Bot, User, Loader2, ChevronDown, Wand2 } from 'lucide-react';
import { supabase } from '@/lib/api';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { toast } from 'sonner';

export interface AvniAction {
  type: 'fill_prompt' | 'navigate' | 'set_style' | 'set_aspect_ratio' | 'open_history' | 'switch_tab';
  payload: string | boolean;
}

interface AvniAIChatProps {
  currentPrompt: string;
  onAction: (action: AvniAction) => void;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  action?: AvniAction | null;
}

const QUICK_PROMPTS = [
  'Help me create a prompt',
  'How do I use the Edit tab?',
  'Suggest a fantasy scene',
  'Take me to the Studio',
];

async function callAvniChat(messages: { role: string; content: string }[], currentPrompt: string) {
  const { data, error } = await supabase.functions.invoke('avni-ai-chat', {
    body: { messages, currentPrompt },
  });
  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) {
      try { const t = await error.context?.text(); msg = `[${error.context?.status}] ${t || msg}`; } catch {}
    }
    throw new Error(msg);
  }
  return data as { message: string; action: AvniAction | null };
}

export default function AvniAIChat({ currentPrompt, onAction }: AvniAIChatProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: "Hi! I'm **Avni**, your AI studio assistant. I can help you craft prompts, navigate the app, set styles, and more. What would you like to create today?",
      action: null,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    const userMsg: ChatMessage = { role: 'user', content: trimmed };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const history = [...messages, userMsg].map(m => ({ role: m.role, content: m.content }));
      const result = await callAvniChat(history, currentPrompt);
      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: result.message || 'Done!',
        action: result.action || null,
      };
      setMessages(prev => [...prev, assistantMsg]);
      if (result.action) {
        onAction(result.action);
        if (result.action.type === 'fill_prompt') {
          toast.success('Prompt filled in Studio!');
        } else if (result.action.type === 'navigate') {
          toast.success(`Navigating to ${result.action.payload}...`);
        }
      }
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', action: null }]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading, currentPrompt, onAction]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input); }
  };

  // Simple markdown bold renderer
  const renderContent = (text: string) => {
    return text.split(/\*\*(.*?)\*\*/g).map((part, i) =>
      i % 2 === 1 ? <strong key={i} className="font-semibold text-primary/90">{part}</strong> : part
    );
  };

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`fixed bottom-6 right-6 z-50 w-13 h-13 rounded-2xl shadow-2xl flex items-center justify-center transition-all duration-300 ${open ? 'studio-gradient rotate-180 scale-95' : 'studio-gradient hover:scale-105 hover:shadow-[0_0_30px_rgba(147,80,230,0.6)]'}`}
        style={{ width: 52, height: 52 }}
        aria-label="Open Avni AI Chat"
      >
        {open ? <ChevronDown className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
      </button>

      {/* Unread dot */}
      {!open && messages.length > 1 && (
        <div className="fixed bottom-[66px] right-5 z-50 w-3 h-3 rounded-full bg-studio-gold border-2 border-background animate-pulse" />
      )}

      {/* Chat panel */}
      <div
        className={`fixed bottom-[70px] right-4 z-50 w-[340px] sm:w-[380px] flex flex-col rounded-2xl overflow-hidden shadow-2xl border border-border/40 transition-all duration-300 origin-bottom-right
          ${open ? 'scale-100 opacity-100 pointer-events-auto' : 'scale-90 opacity-0 pointer-events-none'}`}
        style={{ maxHeight: '520px', background: 'hsl(240, 12%, 7%)', backdropFilter: 'blur(16px)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/40 flex-shrink-0 studio-gradient">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-xl bg-white/20 flex items-center justify-center">
              <Sparkles className="w-3.5 h-3.5 text-white" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Avni AI</p>
              <p className="text-[10px] text-white/70">Agentic Studio Assistant</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="w-6 h-6 rounded-lg bg-white/15 hover:bg-white/25 flex items-center justify-center transition-colors"
          >
            <X className="w-3 h-3 text-white" />
          </button>
        </div>

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
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-xs leading-relaxed
                ${msg.role === 'user'
                  ? 'bg-primary/20 text-foreground rounded-tr-sm'
                  : 'bg-secondary/70 text-foreground/90 rounded-tl-sm border border-border/30'}`}>
                {renderContent(msg.content)}
                {msg.action && (
                  <div className="mt-1.5 flex items-center gap-1 text-[10px] text-primary/70">
                    <Wand2 className="w-2.5 h-2.5" />
                    <span>Action: {msg.action.type.replace(/_/g, ' ')}</span>
                  </div>
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

        {/* Quick prompts (only show at start) */}
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
