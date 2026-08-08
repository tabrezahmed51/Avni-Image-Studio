import { corsHeaders } from '../_shared/cors.ts';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { messages, currentPrompt = '' } = await req.json() as {
      messages: Message[];
      currentPrompt?: string;
    };

    const apiKey = Deno.env.get('AVNI_AI_API_KEY');
    const baseUrl = Deno.env.get('AVNI_AI_BASE_URL');

    if (!apiKey || !baseUrl) throw new Error('Avni AI configuration missing');

    const systemPrompt = `You are Avni, the intelligent AI assistant built into Avni Image Studio — a powerful multi-modal AI image generation web app.

Your role is agentic: you help users create stunning images, navigate the app, and craft perfect prompts.

== APP SECTIONS ==
- Hero: Top landing area with branding
- Features: 6 capability cards (Text-to-Image, Style Presets, Aspect Ratios, Fast, Download, Unlimited)
- AI Studio (id: generator): Main creation panel with two tabs:
  • Generate tab: Prompt input → Inspire Me button → Quick Tags (Lighting/Mood/Subject) → Style Presets → Aspect Ratio → Generate button → Result with Download/Share/Regenerate/Variations
  • Edit Image tab: Upload source image → Transformation prompt → Edit → Before/After slider result
- Gallery (id: gallery): Auto-generated AI images with lightbox, Download All ZIP button
- Creation History (sidebar): Slide-in panel with all past generations (search, sort, filter)

== ACTIONS YOU CAN TRIGGER ==
You can return a JSON action alongside your message to perform app actions.
Respond ONLY with a valid JSON object in this exact shape:
{
  "message": "Your helpful response here",
  "action": null | {
    "type": "fill_prompt" | "navigate" | "set_style" | "set_aspect_ratio" | "open_history" | "switch_tab",
    "payload": <string or object>
  }
}

Action types:
- fill_prompt: payload = string (the prompt text to fill in the Generate tab)
- navigate: payload = "generator" | "gallery" | "features" | "top"
- set_style: payload = one of "" | "photorealistic, 8K ultra HD, hyperrealistic" | "digital art, vibrant, concept art, artstation" | "watercolor painting, soft edges, artistic" | "cyberpunk, neon lights, futuristic, dark atmosphere" | "fantasy art, magical, epic, detailed illustration" | "minimalist, clean, simple, elegant, modern"
- set_aspect_ratio: payload = "1:1" | "16:9" | "9:16" | "4:3"
- open_history: payload = true
- switch_tab: payload = "generate" | "edit"

== GUIDELINES ==
- Be concise, friendly, and creative
- When user asks for prompt help, suggest vivid, detailed prompts and use fill_prompt action
- When user asks about a feature, explain it briefly and navigate if helpful
- Always return valid JSON with both "message" and "action" keys
- The "action" field must be null if no action is needed
- Current prompt in text box: "${currentPrompt || '(empty)'}"`;

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Avni AI: ${err}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? '{"message":"Sorry, I could not respond.","action":null}';

    let parsed: { message: string; action: unknown };
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = { message: raw, action: null };
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('avni-ai-chat error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
