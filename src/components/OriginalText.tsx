import { useMemo } from 'react';
import { segmentText } from '../shared/verify';
import styles from './OriginalText.module.scss';

interface Props {
  text: string;
  quotes: string[];
}

export function OriginalText({ text, quotes }: Props) {
  const segments = useMemo(() => segmentText(text, quotes), [text, quotes]);

  return (
    <pre className={styles.text} aria-label="Documento original con cláusulas marcadas">
      {segments.map((segment, i) =>
        segment.flag === null ? (
          <span key={i}>{segment.text}</span>
        ) : (
          <mark key={i} id={`flag-${segment.flag}`} className={styles.mark}>
            {segment.text}
          </mark>
        ),
      )}
    </pre>
  );
}
