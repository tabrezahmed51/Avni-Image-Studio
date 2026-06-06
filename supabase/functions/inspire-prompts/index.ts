import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { partialPrompt = '' } = await req.json();

    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) {
      throw new Error('OnSpace AI configuration missing');
    }

    const themes = [
      'cosmic / space / nebula',
      'fantasy / magical / mythical',
      'cyberpunk / futuristic / neon',
      'nature / landscape / organic',
      'portrait / character / human',
      'architecture / urban / minimalist',
      'underwater / oceanic / deep sea',
      'surrealist / dreamlike / abstract',
    ];

    const theme = themes[Math.floor(Math.random() * themes.length)];

    const systemPrompt = `You are a creative AI art prompt generator for an image generation studio. 
Generate exactly 4 short, vivid, highly descriptive image prompts. 
Each prompt should be 1-2 sentences, rich with visual details, mood, lighting, and style cues.
Output ONLY a JSON array of 4 strings, no other text. Example:
["A glowing forest at twilight...", "A futuristic city with...", ...]`;

    const userMessage = partialPrompt.trim()
      ? `Generate 4 creative image generation prompts expanding on this idea: "${partialPrompt}". 
         Mix different artistic interpretations.`
      : `Generate 4 creative image generation prompts with a "${theme}" theme. 
         Make each one unique and visually striking.`;

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
          { role: 'user', content: userMessage },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OnSpace AI: ${errorText}`);
    }

    const data = await response.json();
    const raw = data.choices?.[0]?.message?.content ?? '[]';

    // Parse JSON array from response
    const jsonMatch = raw.match(/\[[\s\S]*\]/);
    const prompts: string[] = jsonMatch ? JSON.parse(jsonMatch[0]) : [];

    return new Response(
      JSON.stringify({ prompts, theme }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in inspire-prompts function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
