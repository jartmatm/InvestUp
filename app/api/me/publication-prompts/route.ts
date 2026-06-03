import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, verifyPrivyAccessToken } from '@/utils/server/privy';
import { getSupabaseAdminClient } from '@/utils/server/supabase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type OptimizedPublication = {
  title: string;
  tittle?: string;
  summary: string;
  description: string;
  highlights: string[];
  traction: string;
  useOfFunds: string;
  marketOpportunity: string;
  investorNotes: string;
  overview: string;
  whatWeDo: string;
  howWeDoIt: string;
  financialInformation: string;
  investment: string;
  target: string;
  team: string;
  gallery: string;
  extras: string;
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
  process.env.OPENAI_PUBLICATION_PROMPT_ID ?? 'investup-publication-wizard-v1';
const OPENAI_PUBLICATION_PROMPT_VERSION =
  process.env.OPENAI_PUBLICATION_PROMPT_VERSION ?? '1';
const OPENAI_PUBLICATION_MODEL = process.env.OPENAI_PUBLICATION_MODEL ?? 'gpt-4.1-mini';

const PUBLICATION_PROMPT_VARIABLE_KEYS = [
  'business_name',
  'business_address',
  'business_category',
  'operating_time',
  'offer_summary',
  'competitive_edge',
  'monthly_sales',
  'average_ticket',
  'monthly_clients',
  'capital_required_usd',
  'funds_usage',
  'minimum_investment_usd',
  'interest_rate_ea',
  'round_close_date',
  'founder_profile',
  'team_profile',
  'business_achievements',
  'media_photos_count',
  'media_videos_count',
] as const;

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
  schema: 'publish_variables_v3',
  form_fields: formFields,
  openai_prompt_id: OPENAI_PUBLICATION_PROMPT_ID,
  openai_prompt_version: OPENAI_PUBLICATION_PROMPT_VERSION,
});

const localOptimize = (promptText: string): OptimizedPublication => {
  const getField = (...keys: string[]) => {
    for (const key of keys) {
      const match = new RegExp(`^${key}:\\s*(.+)$`, 'im').exec(promptText);
      const value = match?.[1]?.trim() ?? '';
      if (value && !['Not provided', 'No proporcionado'].includes(value)) return value;
    }
    return '';
  };

  const businessName = getField('business_name', 'Nombre') || 'Business opportunity';
  const offer = getField('offer_summary', 'product_description', 'Producto/Servicio');
  const problem = getField('competitive_edge', 'problem_solved', 'Problema que resuelve');
  const differentiation = getField('competitive_edge', 'differentiation', 'Diferenciación');
  const monthlyRevenue = getField('monthly_sales', 'monthly_revenue', 'Ventas mensuales');
  const growthRate = getField('interest_rate_ea', 'growth_rate', 'Crecimiento');
  const useOfFunds = getField('funds_usage', 'Uso de fondos');
  const market = getField('business_category', 'target_customer', 'Cliente ideal');
  const timingReason = getField('round_close_date', 'timing_reason', 'Momento de inversión');
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
    .slice(0, 5000);

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
    overview: description,
    whatWeDo: [offer, problem].filter(Boolean).join('\n\n') || description,
    howWeDoIt: differentiation || 'How the business operates is provided in the founder form.',
    financialInformation: traction || 'Financial information provided in the founder form.',
    investment: [useOfFunds, timingReason].filter(Boolean).join('\n\n') || 'Investment details provided in the founder form.',
    target: market || 'Target customer details provided in the founder form.',
    team:
      getField('founder_profile', 'team_profile', 'founder_info', 'Fundador') ||
      'Team information provided in the founder form.',
    gallery: 'Gallery media is provided by the founder.',
    extras:
      [
        getField('business_achievements', 'achievements', 'Logros'),
        getField('media_photos_count'),
        getField('media_videos_count'),
        timingReason,
      ]
        .filter(Boolean)
        .join('\n\n') || 'Additional details provided in the founder form.',
  };
};

const normalizeOptimizedPublication = (value: unknown, fallbackText: string): OptimizedPublication => {
  if (!isPlainObject(value)) return localOptimize(fallbackText);

  const fallback = localOptimize(fallbackText);
  const normalizeKey = (key: string) =>
    key
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  const extractSectionParagraph = (candidate: unknown) => {
    if (typeof candidate === 'string') return candidate.trim();
    if (!isPlainObject(candidate)) return '';

    return (
      coerceText(candidate.paragraph) ||
      coerceText(candidate.body) ||
      coerceText(candidate.content) ||
      coerceText(candidate.text) ||
      coerceText(candidate.description)
    );
  };

  const getSectionText = (...keys: string[]) => {
    const normalizedKeys = keys.map(normalizeKey);

    for (const key of keys) {
      const direct = extractSectionParagraph(value[key]);
      if (direct) return direct;
    }

    for (const [sectionKey, sectionValue] of Object.entries(value)) {
      if (!normalizedKeys.includes(normalizeKey(sectionKey))) continue;
      const sectionText = extractSectionParagraph(sectionValue);
      if (sectionText) return sectionText;
    }

    const sections = value.sections;
    if (isPlainObject(sections)) {
      for (const [sectionKey, sectionValue] of Object.entries(sections)) {
        if (!normalizedKeys.includes(normalizeKey(sectionKey))) continue;
        const sectionText = extractSectionParagraph(sectionValue);
        if (sectionText) return sectionText;
      }
    }

    if (Array.isArray(sections)) {
      for (const section of sections) {
        if (!isPlainObject(section)) continue;
        const sectionKey =
          coerceText(section.key) ||
          coerceText(section.id) ||
          coerceText(section.title) ||
          coerceText(section.label);
        if (!sectionKey || !normalizedKeys.includes(normalizeKey(sectionKey))) continue;
        const sectionText = extractSectionParagraph(section);
        if (sectionText) return sectionText;
      }
    }

    return '';
  };

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
    title: getText('title', 'tittle', 'project_title', 'headline') || fallback.title,
    summary: getText('summary', 'short_summary', 'executive_summary') || fallback.summary,
    description: (getText('description', 'publication', 'body', 'pitch') || fallback.description).slice(0, 5000),
    highlights,
    traction: getText('traction', 'traction_summary') || fallback.traction,
    useOfFunds: getText('useOfFunds', 'use_of_funds', 'funds_usage') || fallback.useOfFunds,
    marketOpportunity:
      getText('marketOpportunity', 'market_opportunity', 'market_summary') || fallback.marketOpportunity,
    investorNotes: getText('investorNotes', 'investor_notes', 'notes') || fallback.investorNotes,
    overview:
      getSectionText('overview', 'description', 'publication', 'body', 'pitch') || fallback.overview,
    whatWeDo:
      getSectionText('whatWeDo', 'what_we_do', 'what we do', 'what_we_sell', 'business_activity') ||
      fallback.whatWeDo,
    howWeDoIt:
      getSectionText('howWeDoIt', 'how_we_do_it', 'how we do it', 'differentiation', 'competitive_edge') ||
      fallback.howWeDoIt,
    financialInformation:
      getSectionText(
        'financialInformation',
        'financial_information',
        'financial information',
        'financials',
        'traction'
      ) || fallback.financialInformation,
    investment:
      getSectionText('investment', 'investment_offer', 'investment details', 'useOfFunds', 'use_of_funds') ||
      fallback.investment,
    target:
      getSectionText('target', 'target_customer', 'target market', 'marketOpportunity', 'market_opportunity') ||
      fallback.target,
    team: getSectionText('team', 'founder_info', 'founder', 'team_info') || fallback.team,
    gallery: getSectionText('gallery', 'media', 'multimedia') || fallback.gallery,
    extras:
      getSectionText('extras', 'extra', 'testimonials', 'achievements', 'investorNotes', 'investor_notes') ||
      fallback.extras,
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
    description: clean.slice(0, 5000),
    highlights: bulletHighlights.length >= 2 ? bulletHighlights : fallback.highlights,
    traction: fallback.traction,
    useOfFunds: fallback.useOfFunds,
    marketOpportunity: fallback.marketOpportunity,
    investorNotes: `Generated by OpenAI prompt ${OPENAI_PUBLICATION_PROMPT_ID} v${OPENAI_PUBLICATION_PROMPT_VERSION}.`,
    overview: clean || fallback.overview,
    whatWeDo: fallback.whatWeDo,
    howWeDoIt: fallback.howWeDoIt,
    financialInformation: fallback.financialInformation,
    investment: fallback.investment,
    target: fallback.target,
    team: fallback.team,
    gallery: fallback.gallery,
    extras: fallback.extras,
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

const buildPromptVariables = (formFields: Record<string, unknown>) =>
  PUBLICATION_PROMPT_VARIABLE_KEYS.reduce<Record<string, string>>((variables, key) => {
    const value = formFields[key];
    variables[key] = typeof value === 'string' ? value.trim() : coerceText(value);
    return variables;
  }, {});

const buildOpenAiPublicationSystemPrompt = () => `
You are an expert fintech marketplace copywriter for InvestUp.
Write investor-facing content in clear English, professional and concise, never hypey.

Hard requirements:
- Return ONLY valid JSON (no markdown, no code fences, no extra text).
- Use exactly these top-level keys:
  title, summary, description, highlights, traction, use_of_funds, market_opportunity, investor_notes,
  sections
- sections must be an object with exactly these keys:
  overview, what_we_do, how_we_do_it, financial_information, investment, target, team, gallery, extras
- title max 50 chars.
- description max 5000 chars.
- highlights must be an array with 3 to 5 short bullet-style strings.
- If data is missing, infer conservatively and state assumptions neutrally.
- Do not invent legal guarantees, returns, or risk-free statements.
`.trim();

const buildOpenAiPublicationUserPrompt = (formFields: Record<string, unknown>, promptText: string) => {
  const variables = buildPromptVariables(formFields);
  const formattedVariables = Object.entries(variables)
    .map(([key, value]) => `- ${key}: ${value || 'Not provided'}`)
    .join('\n');

  return `
Create the publication JSON from this wizard data.

Wizard tags:
${formattedVariables}

Raw collected prompt text:
${promptText}
`.trim();
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
      model: OPENAI_PUBLICATION_MODEL,
      input: [
        {
          role: 'system',
          content: [
            {
              type: 'input_text',
              text: buildOpenAiPublicationSystemPrompt(),
            },
          ],
        },
        {
          role: 'user',
          content: [
            {
              type: 'input_text',
              text: buildOpenAiPublicationUserPrompt(formFields, promptText),
            },
          ],
        },
      ],
      temperature: 0.4,
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
    provider: `openai-responses-${OPENAI_PUBLICATION_MODEL}`,
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
  const metadata = isPlainObject(body.metadata) ? body.metadata : {};
  const metadataStatus = coerceText(metadata.status);
  const metadataStep = coerceText(metadata.step);
  const draftStatus =
    metadataStatus === 'published' || metadataStep === 'publication_final_v1'
      ? 'published'
      : 'draft';
  const payload = {
    user_id: verified.userId,
    prompt_json: promptJson,
    prompt_text: promptText,
    optimized_publication: null,
    provider: null,
    status: draftStatus,
    metadata: buildPromptMetadata(formFields, metadata),
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
