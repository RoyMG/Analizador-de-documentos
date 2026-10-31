# Analizador de documentos

Pega un contrato, unos términos y condiciones o un recibo, y la app te explica en lenguaje simple qué te cobran, qué te obligan a hacer y dónde están las cláusulas problemáticas. Cada bandera roja incluye la **cita literal** del documento, que la app verifica contra el texto original y resalta, para que cualquiera pueda comprobarla.

Stack: React + TypeScript + Vite, SCSS Modules, Vitest. Servidor Express que llama a Claude (la API key nunca llega al navegador).

## Cómo correrlo

```bash
npm install
cp .env.example .env        # opcional: agrega tu ANTHROPIC_API_KEY
npm run dev                 # web en http://localhost:5173, API en :8787
```

Para que el servidor lea `.env`: `export $(grep -v '^#' .env | xargs)` antes de `npm run dev`, o define `ANTHROPIC_API_KEY` en tu terminal.

- **Con API key:** análisis con Claude (`claude-sonnet-5-5`, configurable con `ANTHROPIC_MODEL`).
- **Sin API key:** modo demo con reglas simples, útil para probar la interfaz. La app lo indica con una etiqueta.

## Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | API + Vite en paralelo |
| `npm run build` | Typecheck y build de producción en `dist/` |
| `npm start` | Servidor que además sirve `dist/` (todo en el puerto 8787) |
| `npm test` | Pruebas con Vitest |

## Guion sugerido para la demo

1. Pulsa el ejemplo "Contrato de renta" y luego "Explícame esto".
2. Muestra el veredicto, las banderas rojas y el cuadro de montos.
3. Pulsa "Ver en el documento" en una bandera: la cita aparece resaltada en el texto original (validación).
4. Pide al público que pegue su propio contrato, TyC o recibo.

## Estructura

- `server/`: endpoint `/api/analyze`, prompt y respaldo en modo demo.
- `src/shared/`: tipos, verificación de citas, normalización de la respuesta y reglas del modo demo (compartido entre cliente y servidor).
- `src/components/`: resultados y texto original resaltado.

> No sustituye la asesoría de un abogado.
