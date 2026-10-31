export interface QuoteRange {
  start: number;
  end: number;
}

export interface Segment {
  text: string;
  /** Índice de la bandera roja a la que pertenece el fragmento, o null. */
  flag: number | null;
}

const escapeRegex = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Busca una cita dentro del documento original. Primero exacta; si no,
 * tolerando diferencias de espacios y saltos de línea.
 */
export function findQuote(text: string, quote: string): QuoteRange | null {
  const q = quote.trim();
  if (q.length < 8) return null;

  const exact = text.indexOf(q);
  if (exact >= 0) return { start: exact, end: exact + q.length };

  const pattern = q.split(/\s+/).map(escapeRegex).join('\\s+');
  const match = new RegExp(pattern, 'i').exec(text);
  return match ? { start: match.index, end: match.index + match[0].length } : null;
}

/** Divide el texto en fragmentos normales y fragmentos marcados por cada cita. */
export function segmentText(text: string, quotes: string[]): Segment[] {
  const ranges: Array<QuoteRange & { flag: number }> = [];
  quotes.forEach((quote, flag) => {
    const range = findQuote(text, quote);
    if (range) ranges.push({ ...range, flag });
  });
  ranges.sort((a, b) => a.start - b.start);

  const segments: Segment[] = [];
  let cursor = 0;
  for (const range of ranges) {
    if (range.start < cursor) continue; // se traslapa con una cita anterior
    if (range.start > cursor) segments.push({ text: text.slice(cursor, range.start), flag: null });
    segments.push({ text: text.slice(range.start, range.end), flag: range.flag });
    cursor = range.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), flag: null });
  return segments.length > 0 ? segments : [{ text, flag: null }];
}
