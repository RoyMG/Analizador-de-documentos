import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from './App';
import { analyzeOffline } from './shared/heuristic';
import { SAMPLES } from './samples';

const mockFetch = vi.fn();

beforeEach(() => {
  mockFetch.mockImplementation(async (url: string, init?: RequestInit) => {
    if (url === '/api/health') return new Response(JSON.stringify({ ok: true, ai: false }));
    const { text } = JSON.parse(String(init?.body)) as { text: string };
    return new Response(JSON.stringify(analyzeOffline(text)));
  });
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockFetch.mockReset();
});

describe('App', () => {
  it('mantiene deshabilitado el botón hasta que haya texto suficiente', async () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /explícame esto/i })).toBeDisabled();
    await waitFor(() => expect(screen.getByText('Modo demo')).toBeInTheDocument());
  });

  it('carga un ejemplo, lo analiza y muestra banderas con cita verificada', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: SAMPLES[0].label }));
    expect(screen.getByLabelText(/texto del documento/i)).toHaveValue(SAMPLES[0].text);

    await user.click(screen.getByRole('button', { name: /explícame esto/i }));

    expect(await screen.findByText(/banderas rojas/i)).toBeInTheDocument();
    expect(screen.getAllByText(/cita encontrada en tu documento/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/modo demo \(sin ia\)/i)).toBeInTheDocument();
  });

  it('muestra el mensaje de error del servidor', async () => {
    mockFetch.mockImplementation(async (url: string) => {
      if (url === '/api/health') return new Response(JSON.stringify({ ok: true, ai: true }));
      return new Response(JSON.stringify({ error: 'El servidor falló' }), { status: 500 });
    });
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: SAMPLES[1].label }));
    await user.click(screen.getByRole('button', { name: /explícame esto/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('El servidor falló');
  });
});
