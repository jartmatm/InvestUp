import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, verifyPrivyAccessToken } from '@/utils/server/privy';
import { getSupabaseAdminClient } from '@/utils/server/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type OptimizedPublication = {
  title: string;
  summary: string;
  description: string;
  highlights: string[];
  traction: string;
  useOfFunds: string;
  marketOpportunity: string;
  investorNotes: string;
};

const JSON_HEADERS = {
  'Cache-Control': 'private, no-store',
} as const;

const jsonNoStore = (body: unknown, init?: ResponseInit) => {
  const response = NextResponse.json(body, init);
  Object.entries(JSON_HEADERS).forEach(([key, value]) => response.headers.set(key, value));
  return response;
};

const coerceText = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

async function verifyRequiredRequest(request: NextRequest) {
  const accessToken = extractBearerToken(request.headers.get('authorization'));
  if (!accessToken) {
    return {
      error: jsonNoStore({ error: 'Missing Authorization bearer token.' }, { status: 401 }),
      verified: null,
    };
  }

  try {
    const verified = await verifyPrivyAccessToken(accessToken);
    return { error: null, verified };
  } catch {
    return {
      error: jsonNoStore({ error: 'Invalid access token.' }, { status: 401 }),
      verified: null,
    };
  }
}

const localOptimize = (promptText: string): OptimizedPublication => {
  const getField = (key: string) => {
    const match = new RegExp(`^${key}:\\s*(.+)$`, 'im').exec(promptText);
    const value = match?.[1]?.trim() ?? '';
    return value === 'Not provided' ? '' : value;
  };

  const businessName = getField('business_name') || 'Business opportunity';
  const offer = getField('product_description');
  const problem = getField('problem_solved');
  const monthlyRevenue = getField('monthly_revenue');
  const growthRate = getField('growth_rate');
  const useOfFunds = getField('funds_usage');
  const market = getField('target_customer');
  const timingReason = getField('timing_reason');
  const traction = [monthlyRevenue, growthRate].filter(Boolean).join(' with ');

  const summary = `${businessName} is raising growth capital for a business with clear customer demand and a focused use of funds.`;
  const description = [
    summary,
    offer ? `The company sells ${offer}.` : '',
    problem ? `It solves ${problem}.` : '',
    traction ? `Current traction: ${traction}.` : '',
    useOfFunds ? `Use of funds: ${useOfFunds}.` : '',
    market ? `Ideal customer: ${market}.` : '',
    timingReason ? `Timing: ${timingReason}.` : '',
  ]
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 2500);

  return {
    title: `${businessName} growth round`.slice(0, 120),
    summary,
    description,
    highlights: [
      traction ? `Traction: ${traction}` : 'Clear traction provided by the founder',
      useOfFunds ? `Use of funds: ${useOfFunds}` : 'Defined use of capital',
      market ? `Customer: ${market}` : 'Focused customer segment',
      timingReason ? `Timing: ${timingReason}` : 'Current timing explained by the founder',
    ],
    traction: traction || 'Traction details provided in the founder form.',
    useOfFunds: useOfFunds || 'Use of funds provided in the founder form.',
    marketOpportunity: market || 'Market opportunity provided in the founder form.',
    investorNotes: 'Generated from the guided publication form variables.',
  };
};

const normalizeOptimizedPublication = (value: unknown, fallbackText: string): OptimizedPublication => {
  if (!isPlainObject(value)) return localOptimize(fallbackText);

  const fallback = localOptimize(fallbackText);
  const highlights = Array.isArray(value.highlights)
    ? value.highlights
        .map((item) => coerceText(item))
        .filter(Boolean)
        .slice(0, 5)
    : fallback.highlights;

  return {
    title: coerceText(value.title) || fallback.title,
    summary: coerceText(value.summary) || fallback.summary,
    description: (coerceText(value.description) || fallback.description).slice(0, 2500),
    highlights,
    traction: coerceText(value.traction) || fallback.traction,
    useOfFunds: coerceText(value.useOfFunds) || fallback.useOfFunds,
    marketOpportunity: coerceText(value.marketOpportunity) || fallback.marketOpportunity,
    investorNotes: coerceText(value.investorNotes) || fallback.investorNotes,
  };
};

const parseJsonObject = (content: string) => {
  try {
    return JSON.parse(content) as Record<string, unknown>;
  } catch {
    const match = /\{[\s\S]*\}/.exec(content);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
};

async function optimizeWithOpenAi(promptText: string) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { provider: 'local', optimizedPublication: localOptimize(promptText) };
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.35,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'You write concise investment marketplace listings from snake_case founder variables. Return only valid JSON with keys: title, summary, description, highlights, traction, useOfFunds, marketOpportunity, investorNotes. Keep description under 2500 characters. Avoid generic claims and do not invent metrics.',
          },
          {
            role: 'user',
            content: `Create an investor-ready publication from this guided founder form:\n\n${promptText}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      return { provider: 'local-fallback', optimizedPublication: localOptimize(promptText) };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data.choices?.[0]?.message?.content?.trim() ?? '';
    const parsed = parseJsonObject(content);

    return {
      provider: 'openai',
      optimizedPublication: normalizeOptimizedPublication(parsed, promptText),
    };
  } catch {
    return { provider: 'local-fallback', optimizedPublication: localOptimize(promptText) };
  }
}

export async function POST(request: NextRequest) {
  const { error, verified } = await verifyRequiredRequest(request);
  if (error || !verified) return error;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const promptJson = body.promptJson;
  const promptText = coerceText(body.promptText);

  if (!isPlainObject(promptJson) || !promptText) {
    return jsonNoStore({ error: 'A complete publication prompt is required.' }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const formFields = isPlainObject(promptJson.fields) ? promptJson.fields : {};

  try {
    const { data: inserted, error: insertError } = await supabase
      .from('project_publication_prompts')
      .insert({
        user_id: verified.userId,
        prompt_json: promptJson,
        prompt_text: promptText,
        status: 'optimizing',
        metadata: {
          schema: 'publish_variables_v1',
          form_fields: formFields,
        },
      })
      .select('id')
      .maybeSingle();

    if (insertError) {
      return jsonNoStore(
        { error: 'Could not save the publication prompt.', details: insertError.message ?? null },
        { status: 500 }
      );
    }

    const id = String((inserted as { id?: string | number } | null)?.id ?? '');
    const { provider, optimizedPublication } = await optimizeWithOpenAi(promptText);

    const { error: updateError } = await supabase
      .from('project_publication_prompts')
      .update({
        optimized_publication: optimizedPublication,
        provider,
        status: 'review_ready',
      })
      .eq('id', id)
      .eq('user_id', verified.userId);

    if (updateError) {
      return jsonNoStore(
        { error: 'The prompt was saved, but the optimized publication could not be stored.', details: updateError.message ?? null },
        { status: 500 }
      );
    }

    return jsonNoStore(
      {
        data: {
          id,
          provider,
          optimizedPublication,
        },
      },
      { status: 200 }
    );
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unknown server error.';
    return jsonNoStore({ error: 'Publication prompt request failed.', details: message }, { status: 500 });
  }
}
