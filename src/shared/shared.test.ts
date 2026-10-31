import { describe, expect, it } from 'vitest';
import { analyzeOffline } from './heuristic';
import { extractJson, normalizeAnalysis } from './normalize';
import { SAMPLES } from '../samples';
import { findQuote, segmentText } from './verify';

describe('findQuote', () => {
  const text = 'Primera cláusula.\nEl pago   se hará\nel día cinco de cada mes.';

  it('encuentra citas exactas', () => {
    const range = findQuote(text, 'Primera cláusula.');
    expect(range).toEqual({ start: 0, end: 17 });
  });

  it('tolera diferencias de espacios y saltos de línea', () => {
    const range = findQuote(text, 'El pago se hará el día cinco');
    expect(range).not.toBeNull();
  });

  it('devuelve null si la cita no existe o es muy corta', () => {
    expect(findQuote(text, 'Cláusula inventada que no aparece')).toBeNull();
    expect(findQuote(text, 'pago')).toBeNull();
  });
});

describe('segmentText', () => {
  it('separa el texto en fragmentos marcados y normales', () => {
    const text = 'Antes. Cláusula problemática aquí. Después.';
    const segments = segmentText(text, ['Cláusula problemática aquí.']);
    expect(segments.map((s) => s.text).join('')).toBe(text);
    expect(segments.filter((s) => s.flag === 0)).toHaveLength(1);
  });
});

describe('extractJson / normalizeAnalysis', () => {
  it('extrae JSON dentro de un bloque de código', () => {
    expect(extractJson('```json\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('lanza error si no hay JSON', () => {
    expect(() => extractJson('sin json')).toThrow();
  });

  it('normaliza y marca como no verificadas las citas inventadas', () => {
    const text = 'La renta mensual será de $9,500.00 pesos y se renueva automáticamente.';
    const analysis = normalizeAnalysis(
      {
        docType: 'Contrato',
        verdict: 'raro',
        summary: 'Resumen',
        redFlags: [
          { title: 'Real', severity: 'alta', quote: 'se renueva automáticamente', explanation: 'x' },
          { title: 'Falsa', severity: 'urgente', quote: 'esto no está en el texto', explanation: 'y' },
        ],
      },
      text,
      'ia',
    );
    expect(analysis.verdict).toBe('precaucion');
    expect(analysis.redFlags[0].verified).toBe(true);
    expect(analysis.redFlags[1].verified).toBe(false);
    expect(analysis.redFlags[1].severity).toBe('media');
    expect(analysis.mode).toBe('ia');
  });
});

describe('analyzeOffline', () => {
  it.each(SAMPLES)('detecta banderas rojas verificables en "$label"', (sample) => {
    const analysis = analyzeOffline(sample.text);
    expect(analysis.redFlags.length).toBeGreaterThan(0);
    for (const flag of analysis.redFlags) {
      expect(findQuote(sample.text, flag.quote)).not.toBeNull();
    }
    expect(analysis.mode).toBe('demo');
  });

  it('clasifica el contrato de renta como riesgo y de tipo arrendamiento', () => {
    const renta = SAMPLES.find((s) => s.id === 'renta')!;
    const analysis = analyzeOffline(renta.text);
    expect(analysis.verdict).toBe('riesgo');
    expect(analysis.docType).toBe('Contrato de arrendamiento');
    expect(analysis.costs.length).toBeGreaterThan(0);
  });

  it('marca como seguro un texto sin cláusulas problemáticas', () => {
    const analysis = analyzeOffline(
      'Este documento describe el horario de la biblioteca municipal. Abre de lunes a viernes de nueve a cinco.',
    );
    expect(analysis.verdict).toBe('seguro');
    expect(analysis.redFlags).toHaveLength(0);
  });
});
