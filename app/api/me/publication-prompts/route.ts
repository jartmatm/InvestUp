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

type PublicationPromptRow = {
  id?: string | number | null;
  prompt_json?: unknown;
  prompt_text?: string | null;
  optimized_publication?: unknown;
  provider?: string | null;
  status?: string | null;
  metadata?: unknown;
  created_at?: string | null;
  updated_at?: string | null;
};

const JSON_HEADERS = {
  'Cache-Control': 'private, no-store',
} as const;

const OPENAI_PUBLICATION_PROMPT_ID =
  process.env.OPENAI_PUBLICATION_PROMPT_ID ??
  'pmpt_69f57f7a85c081979c1668cfaa3bf80d0f79b0106d6c32c4';
const OPENAI_PUBLICATION_PROMPT_VERSION =
  process.env.OPENAI_PUBLICATION_PROMPT_VERSION ?? '2';

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

const normalizePromptDraftRow = (row: PublicationPromptRow | null) => {
  if (!row) return null;

  return {
    id: String(row.id ?? ''),
    promptJson: row.prompt_json ?? null,
    promptText: coerceText(row.prompt_text),
    optimizedPublication: isPlainObject(row.optimized_publication)
      ? normalizeOptimizedPublication(row.optimized_publication, coerceText(row.prompt_text))
      : null,
    provider: coerceText(row.provider) || null,
    status: coerceText(row.status) || null,
    metadata: isPlainObject(row.metadata) ? row.metadata : null,
    createdAt: coerceText(row.created_at) || null,
    updatedAt: coerceText(row.updated_at) || null,
  };
};

const buildPromptMetadata = (
  formFields: Record<string, unknown>,
  metadata: unknown
): Record<string, unknown> => ({
  ...(isPlainObject(metadata) ? metadata : {}),
  schema: 'publish_variables_v1',
  form_fields: formFields,
  openai_prompt_id: OPENAI_PUBLICATION_PROMPT_ID,
  openai_prompt_version: OPENAI_PUBLICATION_PROMPT_VERSION,
});

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
  const getText = (...keys: string[]) => {
    for (const key of keys) {
      const text = coerceText(value[key]);
      if (text) return text;
    }
    return '';
  };
  const highlights = Array.isArray(value.highlights)
    ? value.highlights
        .map((item) => coerceText(item))
        .filter(Boolean)
        .slice(0, 5)
    : fallback.highlights;

  return {
    title: getText('title', 'project_title', 'headline') || fallback.title,
    summary: getText('summary', 'short_summary', 'executive_summary') || fallback.summary,
    description: (getText('description', 'publication', 'body', 'pitch') || fallback.description).slice(0, 2500),
    highlights,
    traction: getText('traction', 'traction_summary') || fallback.traction,
    useOfFunds: getText('useOfFunds', 'use_of_funds', 'funds_usage') || fallback.useOfFunds,
    marketOpportunity:
      getText('marketOpportunity', 'market_opportunity', 'market_summary') || fallback.marketOpportunity,
    investorNotes: getText('investorNotes', 'investor_notes', 'notes') || fallback.investorNotes,
  };
};

const normalizeOpenAiTextPublication = (content: string, fallbackText: string): OptimizedPublication => {
  const fallback = localOptimize(fallbackText);
  const clean = content.trim();
  const paragraphs = clean
    .split(/\n{2,}/)
    .map((item) => item.replace(/^#+\s*/, '').trim())
    .filter(Boolean);
  const bulletHighlights = clean
    .split('\n')
    .map((line) => line.replace(/^[-*\u2022]\s*/, '').trim())
    .filter((line) => line && line.length <= 180)
    .slice(0, 5);

  return {
    title: (paragraphs[0] || fallback.title).slice(0, 120),
    summary: (paragraphs[1] || paragraphs[0] || fallback.summary).slice(0, 600),
    description: clean.slice(0, 2500),
    highlights: bulletHighlights.length >= 2 ? bulletHighlights : fallback.highlights,
    traction: fallback.traction,
    useOfFunds: fallback.useOfFunds,
    marketOpportunity: fallback.marketOpportunity,
    investorNotes: `Generated by OpenAI prompt ${OPENAI_PUBLICATION_PROMPT_ID} v${OPENAI_PUBLICATION_PROMPT_VERSION}.`,
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

const buildPromptVariables = (formFields: Record<string, unknown>, promptText: string) => {
  const variables: Record<string, string> = {
    prompt_text: promptText,
    form_json: JSON.stringify(formFields),
  };

  Object.entries(formFields).forEach(([key, value]) => {
    variables[key] = typeof value === 'string' ? value : JSON.stringify(value ?? '');
  });

  return variables;
};

const extractResponseText = (payload: unknown) => {
  if (!isPlainObject(payload)) return '';

  const directText = coerceText(payload.output_text);
  if (directText) return directText;

  const output = Array.isArray(payload.output) ? payload.output : [];
  const chunks: string[] = [];

  output.forEach((item) => {
    if (!isPlainObject(item) || !Array.isArray(item.content)) return;

    item.content.forEach((contentItem) => {
      if (!isPlainObject(contentItem)) return;
      const text = coerceText(contentItem.text);
      if (text) chunks.push(text);
    });
  });

  return chunks.join('\n').trim();
};

async function optimizeWithOpenAi(promptText: string, formFields: Record<string, unknown>) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY on the server environment.');
  }

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: {
        id: OPENAI_PUBLICATION_PROMPT_ID,
        version: OPENAI_PUBLICATION_PROMPT_VERSION,
        variables: buildPromptVariables(formFields, promptText),
      },
    }),
  });

  if (!response.ok) {
    const details = (await response.text().catch(() => '')).slice(0, 700);
    throw new Error(
      `OpenAI Responses API error ${response.status}: ${details || response.statusText || 'Unknown error'}`
    );
  }

  const data = (await response.json()) as unknown;
  const content = extractResponseText(data);
  if (!content) {
    throw new Error('OpenAI returned an empty response.');
  }

  const parsed = parseJsonObject(content);

  return {
    provider: 'openai-responses-prompt',
    optimizedPublication: parsed
      ? normalizeOptimizedPublication(parsed, promptText)
      : normalizeOpenAiTextPublication(content, promptText),
  };
}

export async function GET(request: NextRequest) {
  const { error, verified } = await verifyRequiredRequest(request);
  if (error || !verified) return error;

  try {
    const supabase = getSupabaseAdminClient();
    const { data, error: queryError } = await supabase
      .from('project_publication_prompts')
      .select('id,prompt_json,prompt_text,optimized_publication,provider,status,metadata,created_at,updated_at')
      .eq('user_id', verified.userId)
      .in('status', ['draft', 'review_ready'])
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (queryError) {
      return jsonNoStore(
        { error: 'Could not load your saved publication draft.', details: queryError.message ?? null },
        { status: 500 }
      );
    }

    return jsonNoStore({ data: normalizePromptDraftRow(data as PublicationPromptRow | null) }, { status: 200 });
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unknown server error.';
    return jsonNoStore({ error: 'Publication draft request failed.', details: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const { error, verified } = await verifyRequiredRequest(request);
  if (error || !verified) return error;

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    body = {};
  }

  const draftId = coerceText(body.id);
  const promptJson = body.promptJson;
  const promptText = coerceText(body.promptText);

  if (!isPlainObject(promptJson) || !promptText) {
    return jsonNoStore({ error: 'A publication draft is required.' }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const formFields = isPlainObject(promptJson.fields) ? promptJson.fields : {};
  const payload = {
    user_id: verified.userId,
    prompt_json: promptJson,
    prompt_text: promptText,
    optimized_publication: null,
    provider: null,
    status: 'draft',
    metadata: buildPromptMetadata(formFields, body.metadata),
  };

  try {
    let savedRow: PublicationPromptRow | null = null;

    if (draftId) {
      const updateResult = await supabase
        .from('project_publication_prompts')
        .update(payload)
        .eq('id', draftId)
        .eq('user_id', verified.userId)
        .select('id,prompt_json,prompt_text,optimized_publication,provider,status,metadata,created_at,updated_at')
        .maybeSingle();

      if (updateResult.error) {
        return jsonNoStore(
          { error: 'Could not update the publication draft.', details: updateResult.error.message ?? null },
          { status: 500 }
        );
      }

      savedRow = updateResult.data as PublicationPromptRow | null;
    }

    if (!savedRow) {
      const insertResult = await supabase
        .from('project_publication_prompts')
        .insert(payload)
        .select('id,prompt_json,prompt_text,optimized_publication,provider,status,metadata,created_at,updated_at')
        .maybeSingle();

      if (insertResult.error) {
        return jsonNoStore(
          { error: 'Could not save the publication draft.', details: insertResult.error.message ?? null },
          { status: 500 }
        );
      }

      savedRow = insertResult.data as PublicationPromptRow | null;
    }

    return jsonNoStore({ data: normalizePromptDraftRow(savedRow) }, { status: 200 });
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unknown server error.';
    return jsonNoStore({ error: 'Publication draft save failed.', details: message }, { status: 500 });
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
  const draftId = coerceText(body.id);

  if (!isPlainObject(promptJson) || !promptText) {
    return jsonNoStore({ error: 'A complete publication prompt is required.' }, { status: 400 });
  }

  const supabase = getSupabaseAdminClient();
  const formFields = isPlainObject(promptJson.fields) ? promptJson.fields : {};

  try {
    let id = draftId;

    if (draftId) {
      const updateResult = await supabase
        .from('project_publication_prompts')
        .update({
          prompt_json: promptJson,
          prompt_text: promptText,
          optimized_publication: null,
          provider: null,
          status: 'optimizing',
          metadata: buildPromptMetadata(formFields, body.metadata),
        })
        .eq('id', draftId)
        .eq('user_id', verified.userId)
        .select('id')
        .maybeSingle();

      if (updateResult.error) {
        return jsonNoStore(
          { error: 'Could not update the publication prompt.', details: updateResult.error.message ?? null },
          { status: 500 }
        );
      }

      id = String((updateResult.data as { id?: string | number } | null)?.id ?? '');
    }

    if (!id) {
      const { data: inserted, error: insertError } = await supabase
        .from('project_publication_prompts')
        .insert({
          user_id: verified.userId,
          prompt_json: promptJson,
          prompt_text: promptText,
          status: 'optimizing',
          metadata: buildPromptMetadata(formFields, body.metadata),
        })
        .select('id')
        .maybeSingle();

      if (insertError) {
        return jsonNoStore(
          { error: 'Could not save the publication prompt.', details: insertError.message ?? null },
          { status: 500 }
        );
      }

      id = String((inserted as { id?: string | number } | null)?.id ?? '');
    }

    let provider = '';
    let optimizedPublication: OptimizedPublication | null = null;

    try {
      const optimizedResult = await optimizeWithOpenAi(promptText, formFields);
      provider = optimizedResult.provider;
      optimizedPublication = optimizedResult.optimizedPublication;
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Unknown OpenAI error.';

      await supabase
        .from('project_publication_prompts')
        .update({
          provider: 'openai-responses-prompt',
          status: 'failed',
          metadata: buildPromptMetadata(formFields, {
            ...(isPlainObject(body.metadata) ? body.metadata : {}),
            openai_error: message,
          }),
        })
        .eq('id', id)
        .eq('user_id', verified.userId);

      return jsonNoStore(
        {
          error: 'OpenAI could not optimize the publication.',
          details: message,
        },
        { status: 502 }
      );
    }

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
