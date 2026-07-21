/**
 * Security utilities — bot protection, rate limiting, input sanitization.
 */

// ── XSS sanitizer (client-side) ───────────────────────────────────────
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '')                          // Strip < >
    .replace(/javascript:/gi, '')                  // Block javascript: protocol
    .replace(/on\w+\s*=/gi, '')                    // Block onX= handlers
    .replace(/data:(?!image\/)/gi, '')             // Block non-image data URIs
    .trim()
    .slice(0, 2000);                               // Hard limit
}

// ── Rate limiter (in-memory, per key) ────────────────────────────────
interface RateLimitEntry { count: number; resetAt: number; }
const _store = new Map<string, RateLimitEntry>();

export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = _store.get(key);
  if (!entry || now > entry.resetAt) {
    _store.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= maxRequests) return false;
  entry.count++;
  return true;
}

// ── Detect bot/crawler UA ─────────────────────────────────────────────
export function isBotUserAgent(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  const bots = ['googlebot', 'bingbot', 'slurp', 'duckduckbot', 'baiduspider', 'yandexbot', 'sogou', 'exabot', 'facebot', 'ia_archiver', 'crawl', 'spider', 'scraper'];
  return bots.some(b => ua.includes(b));
}

// ── API key masker ─────────────────────────────────────────────────────
export function maskApiKey(key: string): string {
  if (!key || key.length < 8) return '****';
  const prefix = key.slice(0, 6);
  const suffix = key.slice(-4);
  return `${prefix}${'*'.repeat(Math.min(key.length - 10, 20))}${suffix}`;
}

// ── CSP nonce generator ────────────────────────────────────────────────
export function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

// ── Prompt injection guard ─────────────────────────────────────────────
const INJECTION_PATTERNS = [
  /ignore (previous|all|prior) instructions/i,
  /you are now/i,
  /system:/i,
  /\[INST\]/i,
  /<\|im_start\|>/i,
  /prompt injection/i,
];

export function detectPromptInjection(input: string): boolean {
  return INJECTION_PATTERNS.some(p => p.test(input));
}

// ── Honeypot field check ───────────────────────────────────────────────
export function honeyPotTriggered(val: string): boolean {
  return val.length > 0;
}
