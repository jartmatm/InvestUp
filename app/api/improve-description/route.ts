import { NextRequest, NextResponse } from 'next/server';

const localImprove = (text: string) => {
  const clean = text.trim().replace(/\s+/g, ' ');
  if (!clean) return '';
  const body = clean.endsWith('.') ? clean : `${clean}.`;
  return `Resumen ejecutivo: ${body}\n\nPropuesta de valor: ${body}\n\nUso del capital: ${body}`;
};

export async function POST(request: NextRequest) {
  try {
    const payload = (await request.json()) as { text?: string };
    const text = String(payload?.text ?? '').trim();

    if (!text) {
      return NextResponse.json({ error: 'Texto requerido.' }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ improvedText: localImprove(text), provider: 'local' });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.4,
        messages: [
          {
            role: 'system',
            content:
              'Mejora redaccion en espanol para pitch de emprendimiento. Mantener claridad, tono profesional y maximo 2500 caracteres.',
          },
          { role: 'user', content: text },
        ],
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ improvedText: localImprove(text), provider: 'local-fallback' });
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim();
    if (!content) {
      return NextResponse.json({ improvedText: localImprove(text), provider: 'local-fallback' });
    }

    return NextResponse.json({ improvedText: content.slice(0, 2500), provider: 'openai' });
  } catch {
    return NextResponse.json({ error: 'No se pudo procesar la solicitud.' }, { status: 500 });
  }
}
