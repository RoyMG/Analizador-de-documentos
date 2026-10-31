import { useEffect, useState, type ChangeEvent } from 'react';
import styles from './App.module.scss';
import { analyze, getHealth } from './api';
import { ResultView } from './components/ResultView';
import { SAMPLES } from './samples';
import { MAX_CHARS, MIN_CHARS, type Analysis } from './shared/types';

export function App() {
  const [text, setText] = useState('');
  const [analyzedText, setAnalyzedText] = useState('');
  const [result, setResult] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [readingFile, setReadingFile] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiActive, setAiActive] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    getHealth().then((health) => {
      if (!cancelled) setAiActive(health ? health.ai : null);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const length = text.trim().length;
  const tooShort = length < MIN_CHARS;
  const tooLong = text.length > MAX_CHARS;
  const canSubmit = !loading && !tooShort && !tooLong;

    const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setError(null);
    const isPdf = file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
    try {
      if (isPdf) {
        setReadingFile(true);
        const { extractPdfText } = await import('./pdf');
        setText(await extractPdfText(file));
      } else {
        setText(await file.text());
      }
      setResult(null);
    } catch (e) {
      setError(
        e instanceof Error && e.name === 'PdfError'
          ? e.message
          : 'No se pudo leer el archivo. Prueba con un .txt o PDF con texto, o pega el contenido.',
      );
    } finally {
      setReadingFile(false);
    }
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    setError(null);
    try {
      const analysis = await analyze(text);
      setAnalyzedText(text);
      setResult(analysis);
    } catch (e) {
      setResult(null);
      setError(e instanceof Error ? e.message : 'Ocurrió un error inesperado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <p className={styles.eyebrow}>
          {aiActive === null ? 'Asistente de lectura' : aiActive ? 'IA activa' : 'Modo demo'}
        </p>
        <h1>Analizador de documentos</h1>
        <p className={styles.lead}>
          Pega un contrato, unos términos y condiciones o un recibo. Te explicamos en lenguaje simple qué te
          cobran, qué te obligan a hacer y dónde está la trampa, con la cita textual para que tú lo compruebes.
        </p>
      </header>

      <section className={styles.panel} aria-label="Documento a analizar">
        <div className={styles.samples}>
          <span>Prueba con un ejemplo:</span>
          {SAMPLES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              className={styles.chip}
              onClick={() => {
                setText(sample.text);
                setResult(null);
                setError(null);
              }}
            >
              {sample.label}
            </button>
          ))}
        </div>

        <label htmlFor="documento" className={styles.label}>
          Texto del documento
        </label>
        <textarea
          id="documento"
          className={styles.textarea}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Pega aquí el texto de tu contrato, términos y condiciones o recibo…"
          rows={10}
        />

        <div className={styles.actions}>
          <div className={styles.meta}>
            <span className={tooLong ? styles.over : undefined}>
              {text.length.toLocaleString('es-MX')} / {MAX_CHARS.toLocaleString('es-MX')} caracteres
            </span>
                        <label className={styles.upload}>
              {readingFile ? 'Leyendo archivo…' : 'Subir PDF o .txt'}
              <input
                type="file"
                accept=".pdf,application/pdf,.txt,.md,text/plain"
                onChange={handleFile}
                disabled={readingFile}
                hidden
              />
            </label>
          </div>
          <button type="button" className={styles.primary} disabled={!canSubmit} onClick={handleSubmit}>
            {loading ? 'Analizando…' : 'Explícame esto'}
          </button>
        </div>

        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </section>

      {result && <ResultView analysis={result} text={analyzedText} />}
    </main>
  );
}
