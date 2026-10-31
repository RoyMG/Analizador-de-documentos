import type {
  Analysis,
  AnalysisMode,
  CostItem,
  DateItem,
  DateKind,
  RedFlag,
  Severity,
  Verdict,
} from './types';
import { findQuote } from './verify';

/** Extrae el primer objeto JSON de una respuesta, aunque venga con ```json o texto alrededor. */
export function extractJson(raw: string): unknown {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('La respuesta no contiene JSON.');
  return JSON.parse(raw.slice(start, end + 1));
}

const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value.trim() : fallback;

const strList = (value: unknown, max: number): string[] =>
  Array.isArray(value)
    ? value.map((v) => str(v)).filter((v) => v.length > 0).slice(0, max)
    : [];

const SEVERITIES: Severity[] = ['alta', 'media', 'baja'];
const VERDICTS: Verdict[] = ['seguro', 'precaucion', 'riesgo'];
const DATE_KINDS: DateKind[] = [
  'pago',
  'inicio',
  'fin',
  'limite',
  'emision',
  'periodo',
  'vigencia',
  'firma',
  'celebracion',
  'registro',
  'otro',
];

/** Convierte una respuesta desconocida en un Analysis seguro y verificado contra el texto. */
export function normalizeAnalysis(raw: unknown, text: string, mode: AnalysisMode): Analysis {
  if (typeof raw !== 'object' || raw === null) throw new Error('Respuesta inválida.');
  const r = raw as Record<string, unknown>;

  const costs: CostItem[] = Array.isArray(r.costs)
    ? r.costs
        .map((c): CostItem | null => {
          if (typeof c !== 'object' || c === null) return null;
          const item = c as Record<string, unknown>;
          const concept = str(item.concept);
          const amount = str(item.amount);
          if (!concept || !amount) return null;
          const note = str(item.note);
          return note ? { concept, amount, note } : { concept, amount };
        })
        .filter((c): c is CostItem => c !== null)
        .slice(0, 10)
    : [];

  const dates: DateItem[] = Array.isArray(r.dates)
    ? r.dates
        .map((d): DateItem | null => {
          if (typeof d !== 'object' || d === null) return null;
          const item = d as Record<string, unknown>;
          const label = str(item.label);
          const value = str(item.value);
          if (!label || !value) return null;
          const kind = DATE_KINDS.includes(item.kind as DateKind) ? (item.kind as DateKind) : 'otro';
          const context = str(item.context);
          // El contexto solo se conserva si realmente aparece en el documento.
          return context && findQuote(text, context)
            ? { label, value, kind, context }
            : { label, value, kind };
        })
        .filter((d): d is DateItem => d !== null)
        .slice(0, 14)
    : [];

  const redFlags: RedFlag[] = Array.isArray(r.redFlags)
    ? r.redFlags
        .map((f): RedFlag | null => {
          if (typeof f !== 'object' || f === null) return null;
          const flag = f as Record<string, unknown>;
          const title = str(flag.title);
          const quote = str(flag.quote);
          if (!title || !quote) return null;
          const severity = SEVERITIES.includes(flag.severity as Severity)
            ? (flag.severity as Severity)
            : 'media';
          return {
            title,
            severity,
            quote,
            explanation: str(flag.explanation),
            verified: findQuote(text, quote) !== null,
          };
        })
        .filter((f): f is RedFlag => f !== null)
        .slice(0, 12)
    : [];

  const verdict = VERDICTS.includes(r.verdict as Verdict) ? (r.verdict as Verdict) : 'precaucion';

  return {
    mode,
    docType: str(r.docType, 'Documento'),
    verdict,
    summary: str(r.summary, 'No se pudo generar un resumen.'),
    costs,
    dates,
    obligations: strList(r.obligations, 10),
    redFlags,
    questions: strList(r.questions, 8),
  };
}
