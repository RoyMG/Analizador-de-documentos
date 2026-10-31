import type { DateItem, DateKind } from './types';

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];
const MONTH_RE = `(?:${MONTHS.join('|')}|setiembre)`;
const MONTH_NUM: Record<string, number> = {
  ...Object.fromEntries(MONTHS.map((m, i) => [m, i + 1])),
  setiembre: 9,
};

// Formatos de fecha: "16 de septiembre de 2026", "septiembre 18, 2026", "18/09/2026", "septiembre de 2026"
const DMY = `\\d{1,2}\\s+de\\s+${MONTH_RE}(?:\\s+(?:de|del)\\s+\\d{4})?`;
const MDY = `${MONTH_RE}\\s+\\d{1,2},?\\s+\\d{4}`;
const NUM = '\\d{1,2}[/-]\\d{1,2}[/-]\\d{2,4}';
const MY = `${MONTH_RE}\\s+(?:de|del)\\s+\\d{4}`;
const TIME = '(?:[,\\s]+\\d{1,2}:\\d{2}(?::\\d{2})?(?:\\.\\d+)?)?';
const NO_MY = `(?:${DMY}|${MDY}|${NUM})`;

const SINGLE_RE = new RegExp(`(?<![\\d/-])(?:${DMY}|${MDY}|${NUM}|${MY})${TIME}(?![\\d/])`, 'gi');
const RANGE_RE = new RegExp(
  `(?:desde\\s+(?:el\\s+)?)?${NO_MY}\\s+(?:al|a|hasta(?:\\s+el)?)\\s+${NO_MY}`,
  'gi',
);
const DURATION_RE =
  /vigencia\s+de\s+((?:\d+|[a-záéíóú]+)\s*(?:\(\s*[a-záéíóú ]+?\s*\)\s*)?(?:meses|mes|años|año|d[ií]as))/gi;

// Fechas de pago relativas: "dentro de los primeros cinco días de cada mes", "el día 5 de cada mes"
const RELATIVE_RE =
  /(?:(?:dentro\s+de\s+)?los\s+)?(?:primeros|[uú]ltimos)\s+\S+\s+d[ií]as\s+(?:naturales\s+)?de\s+cada\s+mes|(?:el\s+)?d[ií]a\s+\d{1,2}\s+de\s+cada\s+mes/gi;

interface Rule {
  kind: DateKind;
  label: string;
  /** Palabras clave ANTES de la fecha: gana la más cercana a ella. */
  before?: RegExp;
  /** Palabras clave justo DESPUÉS de la fecha. */
  after?: RegExp;
}

// Si hay empate de distancia, gana la regla que aparece primero.
const RULES: Rule[] = [
  { kind: 'firma', label: 'Fecha de firma', before: /firm(?:a|ad[oa]|aron)\b|firm[oó]\b|suscrit[oa]|suscribe/gi },
  { kind: 'emision', label: 'Creación del documento', before: /creaci[oó]n|creado/gi },
  { kind: 'registro', label: 'Constancia de conservación', before: /constancia/gi },
  { kind: 'registro', label: 'Última actualización del registro', before: /actualizaci[oó]n|actualizado/gi },
  { kind: 'emision', label: 'Fecha de emisión', before: /emisi[oó]n|emitid[oa]|expedid[oa]|expedici[oó]n/gi },
  {
    kind: 'limite',
    label: 'Fecha límite',
    before: /l[ií]mite|vencimiento|vence\b|a\s+m[aá]s\s+tardar|antes\s+del?\b/gi,
  },
  {
    kind: 'periodo',
    label: 'Periodo / mes correspondiente',
    before: /per[ií]odo|facturad[oa]|consumo|mes\s+correspondiente|correspondiente\s+al?\s+mes/gi,
  },
  {
    kind: 'inicio',
    label: 'Fecha de inicio',
    before: /inicio(?:\s+de\s+(?:la\s+)?vigencia)?|inicia(?:r[aá])?\b|a\s+partir\s+d(?:el|e)|desde\s+el|comienza/gi,
  },
  {
    kind: 'fin',
    label: 'Fecha de término',
    before: /hasta\s+el|terminaci[oó]n|concluye|concluir[aá]|finaliza|t[eé]rmino/gi,
  },
  { kind: 'pago', label: 'Fecha de pago', before: /\bpag(?:o|ar|ad[oa]|adera)\b|abono|dep[oó]sito/gi },
  { kind: 'celebracion', label: 'Celebración de un contrato', after: /^[^.;]{0,40}celebr/i },
  { kind: 'vigencia', label: 'Vigencia', before: /vigencia/gi },
];

const BEFORE_WINDOW = 60; // contexto que se muestra
const CLASSIFY_WINDOW = 120; // texto previo que se usa para decidir de qué fecha se trata
const AFTER_WINDOW = 50;
const MAX_DATES = 14;

function classify(before: string, after: string): { kind: DateKind; label: string } {
  let best: { kind: DateKind; label: string; dist: number } | null = null;
  for (const rule of RULES) {
    let dist: number | null = null;
    if (rule.before) {
      let last: RegExpMatchArray | undefined;
      for (const m of before.matchAll(rule.before)) last = m;
      if (last && last.index !== undefined) dist = before.length - (last.index + last[0].length);
    }
    if (dist === null && rule.after?.test(after)) dist = 25;
    if (dist !== null && (best === null || dist < best.dist)) {
      best = { kind: rule.kind, label: rule.label, dist };
    }
  }
  return best ?? { kind: 'otro', label: 'Otra fecha' };
}

function classifyRange(before: string): { kind: DateKind; label: string } {
  const subject = /vigencia\s+del?\s+(.{3,40}?)\s*$/i.exec(before);
  if (subject) return { kind: 'vigencia', label: `Vigencia del ${subject[1].trim()}` };
  if (/vigencia|contrato|servicio|arrendamiento/i.test(before.slice(-40))) {
    return { kind: 'vigencia', label: 'Vigencia' };
  }
  return { kind: 'periodo', label: 'Periodo / mes correspondiente' };
}

const pad = (n: number): string => String(n).padStart(2, '0');

/** Convierte una fecha a AAAA-MM-DD para detectar duplicados escritos en distinto formato. */
function isoOf(value: string): string | null {
  let m = new RegExp(`^(\\d{1,2})\\s+de\\s+(${MONTH_RE})\\s+(?:de|del)\\s+(\\d{4})`, 'i').exec(value);
  if (m) return `${m[3]}-${pad(MONTH_NUM[m[2].toLowerCase()])}-${pad(+m[1])}`;
  m = new RegExp(`^(${MONTH_RE})\\s+(\\d{1,2}),?\\s+(\\d{4})`, 'i').exec(value);
  if (m) return `${m[3]}-${pad(MONTH_NUM[m[1].toLowerCase()])}-${pad(+m[2])}`;
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})/.exec(value);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const year = m[3].length === 2 ? 2000 + +m[3] : +m[3];
    // 18/09 → día/mes; 09/18 → mes/día; si es ambiguo se asume día/mes (México).
    const [day, month] = b > 12 && a <= 12 ? [b, a] : [a, b];
    return `${year}-${pad(month)}-${pad(day)}`;
  }
  m = new RegExp(`^(${MONTH_RE})\\s+(?:de|del)\\s+(\\d{4})`, 'i').exec(value);
  if (m) return `${m[2]}-${pad(MONTH_NUM[m[1].toLowerCase()])}`;
  return null;
}

function isoKey(value: string, range: boolean): string {
  if (range) {
    const parts = value.split(/\s+(?:al|a|hasta(?:\s+el)?)\s+/i).map(isoOf);
    if (parts.length === 2 && parts[0] && parts[1]) return `${parts[0]}/${parts[1]}`;
  }
  return isoOf(value) ?? value.toLowerCase().replace(/\s+/g, ' ');
}

interface Hit {
  start: number;
  end: number;
  value: string;
  type: 'single' | 'range' | 'duration' | 'relative';
}

/**
 * Extrae fechas del documento y las clasifica según las palabras que las rodean.
 * Trabaja sobre el texto "aplanado" para no perder contexto cuando un PDF corta los renglones.
 */
export function extractDates(raw: string): DateItem[] {
  // Une renglones y repara ligaduras rotas de PDF ("fi rma" → "firma").
  const flat = raw.replace(/\s+/g, ' ').replace(/\b(fi|fl)\s(?=\p{L})/giu, '$1');

  const hits: Hit[] = [];
  const overlaps = (start: number, end: number) => hits.some((h) => start < h.end && end > h.start);

  for (const m of flat.matchAll(RANGE_RE)) {
    hits.push({
      start: m.index,
      end: m.index + m[0].length,
      value: m[0].replace(/^desde\s+(?:el\s+)?/i, ''),
      type: 'range',
    });
  }
  for (const m of flat.matchAll(DURATION_RE)) {
    const value = m[1].replace(/\(\s+/g, '(').replace(/\s+\)/g, ')').replace(/\s+/g, ' ');
    hits.push({ start: m.index, end: m.index + m[0].length, value, type: 'duration' });
  }
  for (const m of flat.matchAll(RELATIVE_RE)) {
    hits.push({ start: m.index, end: m.index + m[0].length, value: m[0].trim(), type: 'relative' });
  }
  for (const m of flat.matchAll(SINGLE_RE)) {
    const end = m.index + m[0].length;
    if (!overlaps(m.index, end)) hits.push({ start: m.index, end, value: m[0].trim(), type: 'single' });
  }
  hits.sort((a, b) => a.start - b.start);

  const out: DateItem[] = [];
  const seen = new Set<string>();
  for (const hit of hits) {
    const beforeStart = Math.max(0, hit.start - BEFORE_WINDOW);
    const before = flat.slice(beforeStart, hit.start);
    const wide = flat.slice(Math.max(0, hit.start - CLASSIFY_WINDOW), hit.start);
    const after = flat.slice(hit.end, hit.end + AFTER_WINDOW);

    let kind: DateKind;
    let label: string;
    if (hit.type === 'duration') {
      kind = 'vigencia';
      label = 'Duración de la vigencia';
    } else if (hit.type === 'relative') {
      kind = 'pago';
      label = 'Fecha de pago';
    } else if (hit.type === 'range') {
      ({ kind, label } = classifyRange(wide));
    } else {
      ({ kind, label } = classify(wide, after));
    }

    const key = `${kind}|${label}|${hit.type === 'duration' || hit.type === 'relative' ? hit.value.toLowerCase() : isoKey(hit.value, hit.type === 'range')}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const lead = beforeStart > 0 ? before.replace(/^\S*\s/, '') : before;
    const tail = hit.end + AFTER_WINDOW < flat.length ? after.replace(/\s\S*$/, '') : after;
    const context = `${beforeStart > 0 ? '…' : ''}${lead}${flat.slice(hit.start, hit.end)}${tail}${tail === after && hit.end + AFTER_WINDOW >= flat.length ? '' : '…'}`;

    out.push({ kind, label, value: hit.value, context: context.trim() });
    if (out.length >= MAX_DATES) break;
  }
  return out;
}
