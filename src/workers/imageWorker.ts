/// <reference lib="webworker" />

/**
 * imageWorker.ts — Web Worker for heavy pixel manipulation.
 * Runs off the main thread so the React UI stays responsive.
 *
 * Message in:  { type: 'APPLY_FILTER', imageData: ImageData, filters: FilterCommand[] }
 * Message in:  { type: 'GENERATE_THUMBNAIL', imageData: ImageData, maxSize: number }
 * Message out: { type: 'RESULT', imageData: ImageData } | { type: 'ERROR', error: string }
 */

export type FilterCommand =
  | { type: 'grayscale'; value: number }       // 0-100
  | { type: 'brightness'; value: number }      // 0-200
  | { type: 'contrast'; value: number }        // 0-200
  | { type: 'sepia'; value: number }           // 0-100
  | { type: 'invert'; value: number }          // 0-100
  | { type: 'saturate'; value: number }        // 0-200
  | { type: 'pixelate'; value: number }        // block size in px
  | { type: 'vignette'; value: number }        // 0-100 intensity
  | { type: 'sharpen'; value: number };        // 0-100

export interface WorkerMessage {
  type: 'APPLY_FILTER' | 'GENERATE_THUMBNAIL';
  imageData?: ImageData;
  filters?: FilterCommand[];
  maxSize?: number;
}

export interface WorkerResult {
  type: 'RESULT' | 'ERROR';
  imageData?: ImageData;
  error?: string;
}

// ── Filter implementations ────────────────────────────────────────────
function applyGrayscale(data: Uint8ClampedArray, intensity: number) {
  const f = intensity / 100;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    data[i]     = r + (gray - r) * f;
    data[i + 1] = g + (gray - g) * f;
    data[i + 2] = b + (gray - b) * f;
  }
}

function applyBrightness(data: Uint8ClampedArray, value: number) {
  const f = value / 100;
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = Math.min(255, data[i] * f);
    data[i + 1] = Math.min(255, data[i + 1] * f);
    data[i + 2] = Math.min(255, data[i + 2] * f);
  }
}

function applyContrast(data: Uint8ClampedArray, value: number) {
  const f = (value / 100) ** 2;
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = Math.min(255, Math.max(0, (data[i] - 128) * f + 128));
    data[i + 1] = Math.min(255, Math.max(0, (data[i + 1] - 128) * f + 128));
    data[i + 2] = Math.min(255, Math.max(0, (data[i + 2] - 128) * f + 128));
  }
}

function applySepia(data: Uint8ClampedArray, intensity: number) {
  const f = intensity / 100;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const sr = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189);
    const sg = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168);
    const sb = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131);
    data[i]     = r + (sr - r) * f;
    data[i + 1] = g + (sg - g) * f;
    data[i + 2] = b + (sb - b) * f;
  }
}

function applyInvert(data: Uint8ClampedArray, intensity: number) {
  const f = intensity / 100;
  for (let i = 0; i < data.length; i += 4) {
    data[i]     = data[i] + (255 - 2 * data[i]) * f;
    data[i + 1] = data[i + 1] + (255 - 2 * data[i + 1]) * f;
    data[i + 2] = data[i + 2] + (255 - 2 * data[i + 2]) * f;
  }
}

function applySaturate(data: Uint8ClampedArray, value: number) {
  const f = value / 100;
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const gray = 0.299 * r + 0.587 * g + 0.114 * b;
    data[i]     = Math.min(255, Math.max(0, gray + (r - gray) * f));
    data[i + 1] = Math.min(255, Math.max(0, gray + (g - gray) * f));
    data[i + 2] = Math.min(255, Math.max(0, gray + (b - gray) * f));
  }
}

function applyVignette(data: Uint8ClampedArray, width: number, height: number, intensity: number) {
  const cx = width / 2, cy = height / 2;
  const maxDist = Math.sqrt(cx * cx + cy * cy);
  const f = intensity / 100;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const factor = 1 - (dist / maxDist) * f;
      const i = (y * width + x) * 4;
      data[i]     = Math.max(0, data[i] * factor);
      data[i + 1] = Math.max(0, data[i + 1] * factor);
      data[i + 2] = Math.max(0, data[i + 2] * factor);
    }
  }
}

// ── Message handler ────────────────────────────────────────────────────
self.addEventListener('message', (e: MessageEvent<WorkerMessage>) => {
  try {
    const { type, imageData, filters, maxSize } = e.data;

    if (type === 'APPLY_FILTER' && imageData && filters) {
      const data = new Uint8ClampedArray(imageData.data);
      const w = imageData.width, h = imageData.height;

      for (const filter of filters) {
        switch (filter.type) {
          case 'grayscale':   applyGrayscale(data, filter.value); break;
          case 'brightness':  applyBrightness(data, filter.value); break;
          case 'contrast':    applyContrast(data, filter.value); break;
          case 'sepia':       applySepia(data, filter.value); break;
          case 'invert':      applyInvert(data, filter.value); break;
          case 'saturate':    applySaturate(data, filter.value); break;
          case 'vignette':    applyVignette(data, w, h, filter.value); break;
        }
      }

      const result = new ImageData(data, w, h);
      const msg: WorkerResult = { type: 'RESULT', imageData: result };
      self.postMessage(msg, [result.data.buffer]);

    } else if (type === 'GENERATE_THUMBNAIL' && imageData && maxSize) {
      // Simple passthrough for now — canvas resize logic would be in main thread
      const msg: WorkerResult = { type: 'RESULT', imageData };
      self.postMessage(msg);

    } else {
      const msg: WorkerResult = { type: 'ERROR', error: 'Unknown message type or missing data' };
      self.postMessage(msg);
    }
  } catch (err) {
    const msg: WorkerResult = { type: 'ERROR', error: err instanceof Error ? err.message : String(err) };
    self.postMessage(msg);
  }
});
