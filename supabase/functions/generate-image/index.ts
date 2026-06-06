import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, aspectRatio = '1:1', style = '', imageBase64 = null } = await req.json();

    if (!prompt) {
      throw new Error('No prompt provided');
    }

    const apiKey = Deno.env.get('ONSPACE_AI_API_KEY');
    const baseUrl = Deno.env.get('ONSPACE_AI_BASE_URL');

    if (!apiKey || !baseUrl) {
      throw new Error('OnSpace AI configuration missing');
    }

    const fullPrompt = style ? `${prompt}, ${style}` : prompt;
    const isEditMode = Boolean(imageBase64);

    console.log(`Mode: ${isEditMode ? 'edit' : 'generate'}, prompt: ${prompt}`);

    // Build message content
    const contentParts: object[] = [];

    // For edit mode, include the source image first
    if (isEditMode && imageBase64) {
      contentParts.push({
        type: 'image_url',
        image_url: { url: imageBase64 },
      });
    }

    contentParts.push({
      type: 'text',
      text: isEditMode
        ? `Edit this image: ${fullPrompt}. Apply the transformation while preserving the overall composition.`
        : `Create a stunning, high-quality image: ${fullPrompt}. Make it visually impressive and artistic.`,
    });

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-image',
        messages: [
          {
            role: 'user',
            content: contentParts,
          },
        ],
        modalities: ['image', 'text'],
        image_config: {
          aspect_ratio: aspectRatio,
          image_size: '1K',
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OnSpace AI Error:', errorText);
      throw new Error(`OnSpace AI: ${errorText}`);
    }

    const data = await response.json();
    const imageUrl = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;

    if (!imageUrl) {
      throw new Error('No image generated');
    }

    // Store in Supabase Storage
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
    const binaryData = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));
    const blob = new Blob([binaryData], { type: 'image/png' });

    const folder = isEditMode ? 'edits' : 'gallery';
    const fileName = `${folder}/${crypto.randomUUID()}.png`;

    const { error: uploadError } = await supabase.storage
      .from('generated-images')
      .upload(fileName, blob, {
        contentType: 'image/png',
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return new Response(
        JSON.stringify({ imageUrl, prompt }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    const { data: { publicUrl } } = supabase.storage
      .from('generated-images')
      .getPublicUrl(fileName);

    console.log('Image stored:', publicUrl);

    return new Response(
      JSON.stringify({ imageUrl: publicUrl, prompt }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  } catch (error) {
    console.error('Error in generate-image function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
