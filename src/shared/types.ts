export type Severity = 'alta' | 'media' | 'baja';
export type Verdict = 'seguro' | 'precaucion' | 'riesgo';
export type AnalysisMode = 'ia' | 'demo';

export interface CostItem {
  concept: string;
  amount: string;
  note?: string;
}

export type DateKind =
  | 'pago'
  | 'inicio'
  | 'fin'
  | 'limite'
  | 'emision'
  | 'periodo'
  | 'vigencia'
  | 'firma'
  | 'celebracion'
  | 'registro'
  | 'otro';

export interface DateItem {
  /** Qué fecha es: "Fecha de firma", "Vigencia del servicio"… */
  label: string;
  /** La fecha tal como aparece en el documento. */
  value: string;
  kind: DateKind;
  /** Fragmento del documento donde aparece, para entender de qué trata. */
  context?: string;
}

export interface RedFlag {
  title: string;
  severity: Severity;
  /** Cita literal tomada del documento, para que cualquiera pueda comprobarla. */
  quote: string;
  explanation: string;
  /** El servidor confirma que la cita realmente aparece en el documento. */
  verified?: boolean;
}

export interface Analysis {
  mode: AnalysisMode;
  docType: string;
  verdict: Verdict;
  summary: string;
  costs: CostItem[];
  dates: DateItem[];
  obligations: string[];
  redFlags: RedFlag[];
  questions: string[];
  notice?: string;
}

export const MAX_CHARS = 40000;
export const MIN_CHARS = 40;
