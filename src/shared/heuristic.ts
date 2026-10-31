import { extractDates } from './dates';
import type { Analysis, CostItem, RedFlag, Severity, Verdict } from './types';

interface Rule {
  pattern: RegExp;
  title: string;
  severity: Severity;
  explanation: string;
  question: string;
}

const RULES: Rule[] = [
  {
    pattern: /renovaci[oó]n\s+autom[aá]tica|renovar[aá]\s+autom[aá]ticamente|se\s+renovar[aá]/i,
    title: 'Se renueva solo',
    severity: 'media',
    explanation:
      'Si no avisas a tiempo, el contrato o la suscripción continúa y te siguen cobrando.',
    question: '¿Con cuánta anticipación y por qué medio debo avisar para que no se renueve?',
  },
  {
    pattern:
      /pena\s+convencional|penalizaci[oó]n|penaliza|terminaci[oó]n\s+anticipada|cancelaci[oó]n\s+anticipada/i,
    title: 'Penalización por salirte antes',
    severity: 'alta',
    explanation: 'Si terminas antes de tiempo, te cobran una cantidad extra definida de antemano.',
    question: '¿Cuánto me costaría exactamente salirme antes de tiempo?',
  },
  {
    pattern: /(incremento|aumento|ajuste)[^.]{0,80}\d+\s?%/i,
    title: 'El precio sube durante el contrato',
    severity: 'media',
    explanation: 'El monto que pagas puede aumentar en un porcentaje fijado en el documento.',
    question: '¿Cuándo y en qué porcentaje máximo puede subir el precio?',
  },
  {
    pattern:
      /no\s+(?:ser[aá]\s+)?reembolsable|no\s+se\s+devolver[aá]|sin\s+derecho\s+a\s+(?:reembolso|devoluci[oó]n)/i,
    title: 'Dinero que no te devuelven',
    severity: 'alta',
    explanation: 'Una parte de lo que pagas no se recupera aunque cambies de opinión o te vayas.',
    question: '¿En qué casos sí me devolverían el dinero y en cuáles no?',
  },
  {
    pattern:
      /sin\s+previo\s+aviso|modificar[^.]{0,60}en\s+cualquier\s+momento|modificaci[oó]n\s+unilateral/i,
    title: 'Pueden cambiar las reglas sin avisarte',
    severity: 'alta',
    explanation: 'La otra parte puede modificar condiciones o precios sin pedir tu consentimiento.',
    question: '¿Me avisarán por escrito antes de cualquier cambio y podré cancelar sin costo?',
  },
  {
    pattern:
      /(compartir|ceder|transferir|vender)[^.]{0,80}(terceros|socios|afiliados)|terceros[^.]{0,60}(datos|informaci[oó]n)/i,
    title: 'Comparten tus datos con terceros',
    severity: 'media',
    explanation: 'Tu información personal puede llegar a otras empresas para fines distintos al servicio.',
    question: '¿Puedo negarme a que compartan mis datos sin perder el servicio?',
  },
  {
    pattern: /arbitraje|renuncia[^.]{0,50}(demanda|acci[oó]n|derecho|tribunal)|renuncias?\s+a/i,
    title: 'Renuncias a derechos',
    severity: 'alta',
    explanation: 'Aceptas resolver conflictos de una forma que puede limitarte para reclamar o demandar.',
    question: '¿A qué derechos estoy renunciando exactamente al firmar?',
  },
  {
    pattern: /intereses?\s+moratorios?|recargo|cargo\s+por\s+(?:pago\s+)?(?:tard[ií]o|retraso)/i,
    title: 'Cargos por pagar tarde',
    severity: 'media',
    explanation: 'Si te retrasas en un pago, se suman intereses o recargos al monto original.',
    question: '¿Cuánto se suma por cada día o mes de retraso y hay días de gracia?',
  },
  {
    pattern: /cargos?\s+adicionales|comisi[oó]n(?:es)?|cargo\s+administrativo/i,
    title: 'Comisiones o cargos extra',
    severity: 'media',
    explanation: 'Además del precio principal hay cobros que pueden no ser evidentes a primera vista.',
    question: '¿Cuál es el costo total real, con todas las comisiones incluidas?',
  },
  {
    pattern:
      /no\s+nos\s+hacemos\s+responsables|exime[^.]{0,30}responsabilidad|limitaci[oó]n\s+de\s+responsabilidad|no\s+ser[aá]\s+responsable/i,
    title: 'Se deslindan de responsabilidad',
    severity: 'media',
    explanation: 'La otra parte limita lo que te responde si algo sale mal.',
    question: '¿Qué pasa si hay un daño o falla por culpa de la empresa?',
  },
  {
    pattern: /suspender[^.]{0,60}(servicio|suministro)|corte\s+del\s+(servicio|suministro)/i,
    title: 'Pueden suspender el servicio',
    severity: 'media',
    explanation: 'Si hay un adeudo o incumplimiento, pueden cortarte el servicio.',
    question: '¿Después de cuántos días de adeudo suspenden el servicio y cuánto cuesta reconectarlo?',
  },
  {
    pattern: /obligado\s+solidario|\baval\b|fiador/i,
    title: 'Alguien más responde por la deuda',
    severity: 'alta',
    explanation: 'Un aval u obligado solidario puede ser cobrado como si fuera el deudor principal.',
    question: '¿Quién responde si yo no pago y hasta por qué monto?',
  },
];

const DOC_TYPES: Array<[RegExp, string]> = [
  [/arrendamiento|arrendador|arrendatario|renta mensual/i, 'Contrato de arrendamiento'],
  [/t[eé]rminos\s+y\s+condiciones|aviso\s+de\s+privacidad|suscripci[oó]n/i, 'Términos y condiciones'],
  [/\bkwh\b|consumo|recibo|periodo\s+facturado|tarifa/i, 'Recibo de servicio'],
  [/cr[eé]dito|pr[eé]stamo|tarjeta|tasa\s+de\s+inter[eé]s/i, 'Contrato de crédito'],
];

const SENTENCE_SPLIT = /(?<=[.;!?])\s+|\n+/;
const MONEY = /\$\s?\d[\d,]*(?:\.\d{1,2})?(?:\s?(?:MXN|pesos))?|\d+(?:\.\d+)?\s?%/gi;
const OBLIGATION = /se\s+obliga|deber[aá]|est[aá]\s+obligad[oa]|se\s+compromete|acepta\s+que|queda\s+obligad/i;

const clip = (s: string, max: number): string => (s.length > max ? `${s.slice(0, max - 1)}…` : s);

export function analyzeOffline(text: string): Analysis {
  const sentences = text
    .split(SENTENCE_SPLIT)
    .map((s) => s.trim())
    .filter((s) => s.length >= 15);

  const redFlags: RedFlag[] = [];
  const questions: string[] = [];
  for (const rule of RULES) {
    const hit = sentences.find((s) => rule.pattern.test(s));
    if (!hit) continue;
    redFlags.push({
      title: rule.title,
      severity: rule.severity,
      quote: clip(hit, 300),
      explanation: rule.explanation,
      verified: true,
    });
    questions.push(rule.question);
  }

  const costs: CostItem[] = [];
  const seen = new Set<string>();
  for (const sentence of sentences) {
    const amounts = sentence.match(MONEY);
    if (!amounts) continue;
    const amount = [...new Set(amounts.map((a) => a.trim()))].join(', ');
    const key = `${sentence}|${amount}`;
    if (seen.has(key)) continue;
    seen.add(key);
    costs.push({ concept: clip(sentence, 110), amount });
    if (costs.length >= 8) break;
  }

  const obligations = sentences.filter((s) => OBLIGATION.test(s)).slice(0, 6).map((s) => clip(s, 220));

  const highCount = redFlags.filter((f) => f.severity === 'alta').length;
  const verdict: Verdict = highCount >= 2 ? 'riesgo' : redFlags.length > 0 ? 'precaucion' : 'seguro';
  const docType = DOC_TYPES.find(([pattern]) => pattern.test(text))?.[1] ?? 'Documento';

  const summary =
    redFlags.length === 0
      ? `Parece un ${docType.toLowerCase()} sin cláusulas especialmente problemáticas según las reglas básicas del modo demo. Aun así, léelo completo antes de firmar.`
      : `Se detectaron ${redFlags.length} puntos a revisar en este ${docType.toLowerCase()}, ${highCount} de ellos de severidad alta. Cada uno incluye la cita textual para que lo compruebes tú mismo en el documento.`;

  return {
    mode: 'demo',
    docType,
    verdict,
    summary,
    costs,
    dates: extractDates(text),
    obligations,
    redFlags,
    questions: questions.slice(0, 8),
    notice:
      'Modo demo: análisis por reglas simples, sin IA. Configura ANTHROPIC_API_KEY en el servidor para activar el análisis con Claude.',
  };
}
