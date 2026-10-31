import { describe, expect, it } from 'vitest';
import { SAMPLES } from '../samples';
import { extractDates } from './dates';

// Contrato ficticio con la misma estructura que un contrato firmado con ZapSign (PDF con renglones cortados).
const CONTRATO = `Vigencia del contrato de renta Desde el 16 de septiembre de 2026 hasta el 15 de septiembre de 2027
TERCERA. Vigencia. El presente Contrato tendrá una vigencia de 12 ( doce ) meses contados a partir del 16 de
septiembre de 2026 , o hasta la terminación natural del Contrato de Arrendamiento.
ANTECEDENTE I. Con fecha 16 de septiembre de 2026 , el CLIENTE celebró con ANA PEREZ un Contrato de Arrendamiento.
Leído que fue, lo suscriben de forma digital, con fecha de inicio de vigencia el día 16 de septiembre de 2026.
4 de 4 Firmado digitalmente vía ZapSign por JUAN PEREZ LOPEZ Fecha 18/09/2026 18:35:43.417 (UTC-0600) Firmado digitalmente vía MARIA GOMEZ DIAZ Fecha 23/09/2026 17:17 ZapSign - abc
Fecha de creación: septiembre 18, 2026, 14:57:25 Hash del documento
Ultima actualización en septiembre 23 2026, 17:17:33 CONSTANCIA DE CONSERVACIÓN
Fecha de la constancia: septiembre 23, 2026, 17:17:33 UTC-0600
J U A N P E R E Z L O P E Z Fecha y hora de fi rma: 09/18/2026 18:35:43`;

describe('extractDates', () => {
  const dates = extractDates(CONTRATO);
  const byLabel = (label: string) => dates.filter((d) => d.label === label);

  it('no deja fechas sin explicar', () => {
    expect(dates.filter((d) => d.kind === 'otro')).toEqual([]);
  });

  it('distingue la firma de cada persona y no repite la misma fecha en otro formato', () => {
    const firmas = byLabel('Fecha de firma');
    expect(firmas.map((d) => d.value)).toEqual(['18/09/2026 18:35:43.417', '23/09/2026 17:17']);
  });

  it('separa inicio, celebración, vigencia y registros del documento', () => {
    expect(byLabel('Fecha de inicio')).toHaveLength(1);
    expect(dates.some((d) => d.kind === 'celebracion' && d.value === '16 de septiembre de 2026')).toBe(true);
    expect(dates.some((d) => d.label === 'Vigencia del contrato de renta')).toBe(true);
    expect(byLabel('Duración de la vigencia')[0].value).toBe('12 (doce) meses');
    expect(byLabel('Creación del documento')).toHaveLength(1);
    expect(byLabel('Constancia de conservación')).toHaveLength(1);
  });

  it('incluye un contexto que contiene la fecha, para entender de qué trata', () => {
    for (const d of dates) expect(d.context).toContain(d.value.split(' ')[0]);
  });

  it('detecta periodo y fecha límite de un recibo, y el pago relativo de una renta', () => {
    const recibo = extractDates(SAMPLES.find((s) => s.id === 'recibo')!.text);
    expect(recibo).toContainEqual(expect.objectContaining({ kind: 'periodo', value: '01 de septiembre al 31 de octubre' }));
    expect(recibo).toContainEqual(expect.objectContaining({ kind: 'limite', value: '20 de noviembre' }));
    const renta = extractDates(SAMPLES.find((s) => s.id === 'renta')!.text);
    expect(renta).toContainEqual(expect.objectContaining({ kind: 'pago', label: 'Fecha de pago' }));
  });
});
