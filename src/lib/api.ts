import { createClient } from '@supabase/supabase-js';
import { FunctionsHttpError } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function invokeFunction(name: string, body: object) {
  const { data, error } = await supabase.functions.invoke(name, { body });

  if (error) {
    let errorMessage = error.message;
    if (error instanceof FunctionsHttpError) {
      try {
        const statusCode = error.context?.status ?? 500;
        const textContent = await error.context?.text();
        errorMessage = `[Code: ${statusCode}] ${textContent || error.message || 'Unknown error'}`;
      } catch {
        errorMessage = `${error.message || 'Failed to read response'}`;
      }
    }
    throw new Error(errorMessage);
  }

  return data;
}

export async function generateImage(
  prompt: string,
  aspectRatio = '1:1',
  style = '',
  imageBase64: string | null = null
): Promise<{ imageUrl: string; prompt: string }> {
  console.log('Generating image:', prompt, imageBase64 ? '(edit mode)' : '(generate mode)');
  return invokeFunction('generate-image', { prompt, aspectRatio, style, imageBase64 });
}

export async function getInspirePrompts(
  partialPrompt = ''
): Promise<{ prompts: string[]; theme: string }> {
  console.log('Fetching inspire prompts...');
  return invokeFunction('inspire-prompts', { partialPrompt });
}

export async function roastImage(imageBase64: string): Promise<{ roastedImage: string }> {
  console.log('Calling roast-image function...');
  return invokeFunction('roast-image', { image: imageBase64 });
}

export function convertImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function downloadAllImagesAsZip(
  images: { url: string; filename: string }[],
  onProgress?: (packed: number, total: number) => void
): Promise<void> {
  const JSZip = (await import('jszip')).default;
  const zip = new JSZip();
  const folder = zip.folder('avni-studio-gallery')!;
  let packed = 0;
  const total = images.length;

  await Promise.all(
    images.map(async ({ url, filename }) => {
      try {
        const res = await fetch(url);
        const blob = await res.blob();
        folder.file(filename, blob);
      } catch {
        console.warn(`Skipped ${filename}`);
      } finally {
        packed++;
        onProgress?.(packed, total);
      }
    })
  );

  const blob = await zip.generateAsync({ type: 'blob' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'avni-studio-gallery.zip';
  a.click();
  URL.revokeObjectURL(a.href);
}
