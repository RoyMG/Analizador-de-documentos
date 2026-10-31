import type { Analysis } from './shared/types';

export async function analyze(text: string): Promise<Analysis> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  });
  const data: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
        ? data.error
        : 'No se pudo analizar el documento.';
    throw new Error(message);
  }
  return data as Analysis;
}

export async function getHealth(): Promise<{ ai: boolean } | null> {
  try {
    const response = await fetch('/api/health');
    if (!response.ok) return null;
    return (await response.json()) as { ai: boolean };
  } catch {
    return null;
  }
}
