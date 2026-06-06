import { corsHeaders } from '../_shared/cors.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();

    if (!image) {
      throw new Error('No image provided');
    }

    console.log('Starting roast generation...');

    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) {
      throw new Error('OnSpace AI configuration missing');
    }

    // Call OnSpace AI using Nano Banana Pro (google/gemini-3-pro-image-preview)
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-pro-image-preview',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image_url',
                image_url: {
                  url: image,
                },
              },
              {
                type: 'text',
                text: 'Overlay this with insane roast scribble, red ink, doodles, remarks, comments.',
              },
            ],
          },
        ],
        modalities: ['image', 'text'],
        image_config: {
          aspect_ratio: '1:1',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OnSpace AI Error:', errorText);
      throw new Error(`OnSpace AI request failed: ${errorText}`);
    }

    const data = await response.json();
    console.log('Roast generation complete');

    // Extract the roasted image
    const roastedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!roastedImage) {
      throw new Error('No roasted image generated');
    }

    return new Response(
      JSON.stringify({ roastedImage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in roast-image function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
