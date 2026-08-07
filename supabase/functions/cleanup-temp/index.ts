import cors from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

/**
 * cleanup-temp — Deletes images in the temp_generations/ folder older than 24 hours.
 * Intended to run as a scheduled cron job or be called manually.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // List all files in temp_generations/
    const { data: files, error: listError } = await supabase.storage
      .from('generated-images')
      .list('temp_generations', {
        limit: 200,
        sortBy: { column: 'created_at', order: 'asc' },
      });

    if (listError) throw new Error(`List error: ${listError.message}`);
    if (!files || files.length === 0) {
      return new Response(JSON.stringify({ deleted: 0, message: 'No temp files found' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    const toDelete = files
      .filter(f => f.created_at && new Date(f.created_at) < cutoff)
      .map(f => `temp_generations/${f.name}`);

    let deleted = 0;
    if (toDelete.length > 0) {
      const { error: deleteError } = await supabase.storage
        .from('generated-images')
        .remove(toDelete);

      if (deleteError) throw new Error(`Delete error: ${deleteError.message}`);
      deleted = toDelete.length;
    }

    console.log(`[cleanup-temp] Deleted ${deleted} files older than 24h`);

    return new Response(JSON.stringify({ deleted, total_checked: files.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[cleanup-temp] Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
