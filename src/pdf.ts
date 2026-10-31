import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';

export const MAX_PDF_PAGES = 40;

export class PdfError extends Error {
  override name = 'PdfError';
}

/** Une los fragmentos de texto de una página respetando los saltos de línea del PDF. */
export function joinPageItems(items: ReadonlyArray<unknown>): string {
  let out = '';
  for (const item of items) {
    if (typeof item !== 'object' || item === null || !('str' in item)) continue;
    const { str, hasEOL } = item as { str: string; hasEOL?: boolean };
    out += str + (hasEOL ? '\n' : ' ');
  }
  return out.replace(/[ \t]+\n/g, '\n').replace(/[ \t]{2,}/g, ' ').trim();
}

/** Extrae el texto de un PDF en el navegador. La librería se carga solo cuando se sube un PDF. */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  const { default: workerUrl } = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

  const task: PDFDocumentLoadingTask = pdfjs.getDocument({
    data: new Uint8Array(await file.arrayBuffer()),
  });
  let doc: PDFDocumentProxy;
  try {
    doc = await task.promise;
  } catch (error) {
    void task.destroy();
    const name = error instanceof Error ? error.name : '';
    if (name === 'PasswordException') {
      throw new PdfError('El PDF está protegido con contraseña. Quítala y vuelve a subirlo.');
    }
    throw new PdfError('No se pudo abrir el PDF. Puede estar dañado.');
  }

  try {
    const pages: string[] = [];
    const total = Math.min(doc.numPages, MAX_PDF_PAGES);
    for (let n = 1; n <= total; n++) {
      const page = await doc.getPage(n);
      pages.push(joinPageItems((await page.getTextContent()).items));
    }
    const text = pages.filter(Boolean).join('\n\n');
    if (text.trim().length < 20) {
      throw new PdfError(
        'Este PDF parece ser una imagen escaneada y no tiene texto seleccionable. Copia el texto a mano o usa uno con texto.',
      );
    }
    return doc.numPages > total
      ? `${text}\n\n[Se leyeron las primeras ${total} de ${doc.numPages} páginas.]`
      : text;
  } finally {
    void task.destroy();
  }
}