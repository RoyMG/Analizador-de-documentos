import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Anthropic from '@anthropic-ai/sdk';
import express from 'express';
import { analyzeOffline } from '../src/shared/heuristic';
import { extractJson, normalizeAnalysis } from '../src/shared/normalize';
import { MAX_CHARS, MIN_CHARS, type Analysis } from '../src/shared/types';
import { SYSTEM_PROMPT, buildUserMessage } from './prompt';

const PORT = Number(process.env.PORT ?? 8787);
const MODEL = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5-5';
const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
const client = hasKey ? new Anthropic() : null;

async function analyzeWithClaude(text: string): Promise<Analysis> {
  if (!client) throw new Error('Sin API key');
  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 3000,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(text) }],
  });
  const block = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
  if (!block) throw new Error('Respuesta vacía del modelo');
  return normalizeAnalysis(extractJson(block.text), text, 'ia');
}

const app = express();
app.use(express.json({ limit: '200kb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, ai: hasKey });
});

app.post('/api/analyze', async (req, res) => {
  const text: unknown = req.body?.text;
  if (typeof text !== 'string' || text.trim().length < MIN_CHARS) {
    res.status(400).json({ error: `Pega al menos ${MIN_CHARS} caracteres del documento.` });
    return;
  }
  if (text.length > MAX_CHARS) {
    res.status(413).json({ error: `El documento supera los ${MAX_CHARS.toLocaleString('es-MX')} caracteres.` });
    return;
  }

  if (!hasKey) {
    res.json(analyzeOffline(text));
    return;
  }

  try {
    res.json(await analyzeWithClaude(text));
  } catch (error) {
    console.error('Fallo el análisis con IA:', error instanceof Error ? error.message : error);
    res.json({
      ...analyzeOffline(text),
      notice: 'No se pudo contactar a la IA en este momento; se muestra el análisis básico en modo demo.',
    });
  }
});

const dist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) {
      next();
      return;
    }
    res.sendFile(path.join(dist, 'index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Analizador de documentos API en http://localhost:${PORT} (${hasKey ? `IA: ${MODEL}` : 'modo demo, sin API key'})`);
});
