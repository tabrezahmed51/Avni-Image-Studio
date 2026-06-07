/** Mask all but the last 4 chars of a secret string */
export function maskSecret(value: string): string {
  if (!value || value.length <= 4) return '••••';
  return '•'.repeat(Math.min(value.length - 4, 24)) + value.slice(-4);
}

/** Returns true if the value is still masked (not yet edited by user) */
export function isMasked(value: string): boolean {
  return /^•+[^•]{0,4}$/.test(value);
}

/** Strip masking — return empty string if value is all masks */
export function unmask(value: string): string {
  return isMasked(value) ? '' : value;
}
