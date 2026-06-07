import type { AIProvider } from '../types/aiIntegration.types';

/** Move a provider from its current position to a new index in the chain */
export function reorderProviders(chain: AIProvider[], from: number, to: number): AIProvider[] {
  if (from === to) return chain;
  const next = [...chain];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Move a provider up by one position */
export function moveUp(chain: AIProvider[], index: number): AIProvider[] {
  if (index <= 0) return chain;
  return reorderProviders(chain, index, index - 1);
}

/** Move a provider down by one position */
export function moveDown(chain: AIProvider[], index: number): AIProvider[] {
  if (index >= chain.length - 1) return chain;
  return reorderProviders(chain, index, index + 1);
}
