export interface Sample {
  id: string;
  label: string;
  text: string;
}

export const SAMPLES: Sample[] = [
  {
    id: 'renta',
    label: 'Contrato de renta',
    text: `CONTRATO DE ARRENDAMIENTO DE CASA HABITACIÓN
Celebrado entre Inmuebles del Valle S.A. de C.V. (el "Arrendador") y la persona que firma al calce (el "Arrendatario").

PRIMERA. La renta mensual será de $9,500.00 pesos, pagadera dentro de los primeros cinco días de cada mes.
SEGUNDA. El Arrendatario entregará un depósito de $19,000.00 pesos, del cual $4,000.00 serán no reembolsables por concepto de gastos de limpieza y administración.
TERCERA. El contrato tendrá vigencia de doce meses y, al terminar, se renovará automáticamente por periodos iguales salvo aviso por escrito con 60 días de anticipación.
CUARTA. En cada renovación la renta tendrá un incremento del 15% sobre el monto vigente.
QUINTA. En caso de terminación anticipada por parte del Arrendatario, deberá pagar una pena convencional equivalente a tres meses de renta.
SEXTA. Por cada día de retraso en el pago se cobrarán intereses moratorios del 1.5% diario sobre el saldo vencido.
SÉPTIMA. El Arrendatario se obliga a cubrir el mantenimiento de áreas comunes y a presentar un obligado solidario con propiedad en la ciudad.
OCTAVA. El Arrendador no será responsable por robos, daños o pérdidas ocurridas dentro del inmueble.`,
  },
  {
    id: 'tyc',
    label: 'Términos de una app',
    text: `TÉRMINOS Y CONDICIONES DE STREAMFLIX PLUS
1. Prueba gratuita de 7 días. Al finalizar, tu suscripción se renovará automáticamente por $249.00 pesos al mes, a menos que canceles antes de que termine la prueba.
2. No se realizan reembolsos por periodos parciales ni por servicio no utilizado.
3. Nos reservamos el derecho de modificar precios y condiciones en cualquier momento y sin previo aviso. El uso continuo del servicio implica tu aceptación.
4. Al aceptar, nos autorizas a compartir tu información personal y hábitos de consumo con terceros y socios comerciales para fines publicitarios.
5. Cualquier controversia se resolverá mediante arbitraje privado y renuncias a iniciar una demanda colectiva o acudir a tribunales.
6. No nos hacemos responsables por interrupciones del servicio ni por la pérdida de contenido.
7. Las cancelaciones solo pueden solicitarse por teléfono en horario de oficina.`,
  },
  {
    id: 'recibo',
    label: 'Recibo de luz',
    text: `RECIBO DE SUMINISTRO ELÉCTRICO
Periodo facturado: 01 de septiembre al 31 de octubre. Consumo total: 612 kWh.
Tarifa aplicada: DAC por consumo promedio mensual superior al límite de alto consumo.
Energía: $2,310.40. IVA 16%: $369.66. Cargo por alumbrado público: $85.00.
Total a pagar: $2,765.06 pesos, con fecha límite el 20 de noviembre.
Si el pago no se realiza en la fecha límite, se aplicará un recargo del 2% sobre el saldo y la empresa podrá suspender el suministro después de dos periodos sin pago.
La reconexión del servicio tendrá un cargo adicional de $95.00 pesos.`,
  },
];
