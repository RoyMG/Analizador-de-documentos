import { useMemo } from 'react';
import type { Analysis, Severity, Verdict } from '../shared/types';
import { OriginalText } from './OriginalText';
import styles from './ResultView.module.scss';

interface Props {
  analysis: Analysis;
  text: string;
}

const VERDICT_COPY: Record<Verdict, { label: string; hint: string }> = {
  seguro: { label: 'Sin alertas relevantes', hint: 'No se detectaron cláusulas problemáticas.' },
  precaucion: { label: 'Revisa antes de firmar', hint: 'Hay puntos que conviene aclarar.' },
  riesgo: { label: 'Alto riesgo: no firmes sin aclarar', hint: 'Hay varias cláusulas muy desfavorables.' },
};

const SEVERITY_LABEL: Record<Severity, string> = { alta: 'Alta', media: 'Media', baja: 'Baja' };

function DateContext({ context, value }: { context: string; value: string }) {
  const i = context.indexOf(value);
  if (i < 0) return <>{context}</>;
  return (
    <>
      {context.slice(0, i)}
      <mark>{value}</mark>
      {context.slice(i + value.length)}
    </>
  );
}

export function ResultView({ analysis, text }: Props) {
  const quotes = useMemo(() => analysis.redFlags.map((f) => f.quote), [analysis.redFlags]);
  const verdict = VERDICT_COPY[analysis.verdict];

  const goToQuote = (index: number) => {
    const el = document.getElementById(`flag-${index}`);
    el?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
  };

  return (
    <section className={styles.result} aria-live="polite">
      <div className={`${styles.verdict} ${styles[analysis.verdict]}`}>
        <div>
          <p className={styles.docType}>{analysis.docType}</p>
          <h2>{verdict.label}</h2>
          <p>{verdict.hint}</p>
        </div>
        <span className={styles.mode}>
          {analysis.mode === 'ia' ? 'Análisis con IA' : 'Modo demo (sin IA)'}
        </span>
      </div>

      {analysis.notice && <p className={styles.notice}>{analysis.notice}</p>}

      <article className={styles.card}>
        <h3>En pocas palabras</h3>
        <p>{analysis.summary}</p>
      </article>

      {analysis.dates.length > 0 && (
        <article className={styles.card}>
          <h3>Fechas</h3>
          <dl className={styles.dates}>
            {analysis.dates.map((date, i) => (
              <div key={`${date.kind}-${date.label}-${date.value}-${i}`} className={styles.dateRow}>
                <dt>{date.label}</dt>
                <dd>
                  {date.value}
                  {date.context && (
                    <small className={styles.dateContext}>
                      <DateContext context={date.context} value={date.value} />
                    </small>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </article>
      )}

      {analysis.redFlags.length > 0 && (
        <article className={styles.card}>
          <h3>Banderas rojas ({analysis.redFlags.length})</h3>
          <ul className={styles.flags}>
            {analysis.redFlags.map((flag, i) => (
              <li key={`${flag.title}-${i}`} className={styles.flag}>
                <div className={styles.flagHead}>
                  <strong>{flag.title}</strong>
                  <span className={`${styles.badge} ${styles[`sev_${flag.severity}`]}`}>
                    Severidad {SEVERITY_LABEL[flag.severity]}
                  </span>
                </div>
                <p>{flag.explanation}</p>
                <blockquote>{flag.quote}</blockquote>
                <div className={styles.flagFoot}>
                  {flag.verified ? (
                    <>
                      <span className={styles.verified}>✓ Cita encontrada en tu documento</span>
                      <button type="button" className={styles.link} onClick={() => goToQuote(i)}>
                        Ver en el documento
                      </button>
                    </>
                  ) : (
                    <span className={styles.unverified}>
                      ⚠ No se pudo ubicar esta cita en el documento; verifícala manualmente.
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </article>
      )}

      {analysis.costs.length > 0 && (
        <article className={styles.card}>
          <h3>Dinero y porcentajes</h3>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">Concepto</th>
                <th scope="col">Monto</th>
              </tr>
            </thead>
            <tbody>
              {analysis.costs.map((cost, i) => (
                <tr key={`${cost.concept}-${i}`}>
                  <td>
                    {cost.concept}
                    {cost.note && <small>{cost.note}</small>}
                  </td>
                  <td className={styles.amount}>{cost.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </article>
      )}

      {analysis.obligations.length > 0 && (
        <article className={styles.card}>
          <h3>Tus obligaciones</h3>
          <ul className={styles.list}>
            {analysis.obligations.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </article>
      )}

      {analysis.questions.length > 0 && (
        <article className={styles.card}>
          <h3>Preguntas para hacer antes de firmar</h3>
          <ul className={styles.list}>
            {analysis.questions.map((item, i) => (
              <li key={i}>{item}</li>
            ))}
          </ul>
        </article>
      )}

      <article className={styles.card}>
        <h3>Tu documento, con las cláusulas marcadas</h3>
        <OriginalText text={text} quotes={quotes} />
      </article>

      <p className={styles.disclaimer}>
        Esta herramienta ayuda a entender textos, no sustituye la asesoría de un abogado. Verifica siempre las
        citas en el documento original.
      </p>
    </section>
  );
}
