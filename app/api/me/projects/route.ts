import { NextRequest, NextResponse } from 'next/server';
import {
  canDeleteProject,
  canPauseProject,
  getNextProjectStatusAfterFunding,
} from '@/lib/project-status';
import { runWithMinimumInvestmentFallback } from '@/lib/supabase-minimum-investment';
import {
  extractBearerToken,
  verifyPrivyAccessToken,
} from '@/utils/server/privy';
import { getSupabaseAdminClient } from '@/utils/server/supabase-admin';
import {
  normalizeProjectFilter,
  normalizeProjectRow,
  PROJECT_SELECT_WITH_MINIMUM_INVESTMENT,
  PROJECT_SELECT_WITHOUT_MINIMUM_INVESTMENT,
  type ProjectMutationPayload,
  type ProjectRecord,
} from '@/utils/projects/shared';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const JSON_HEADERS = {
  'Cache-Control': 'private, no-store',
} as const;

const jsonNoStore = (body: unknown, init?: ResponseInit) => {
  const response = NextResponse.json(body, init);
  Object.entries(JSON_HEADERS).forEach(([key, value]) => response.headers.set(key, value));
  return response;
};

const coerceString = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

const coerceNullableString = (value: unknown) => {
  const normalized = coerceString(value);
  return normalized.length > 0 ? normalized : null;
};

const coerceNumber = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const coercePositiveInteger = (value: unknown) => {
  const parsed = coerceNumber(value);
  if (parsed == null) return null;
  const normalized = Math.floor(parsed);
  return normalized > 0 ? normalized : null;
};

const normalizePhotoUrls = (value: unknown) => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0);
};

const isMinimumInvestmentMissingError = (error: { message?: string } | null) =>
  Boolean(error?.message?.toLowerCase().includes('minimum_investment'));

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

async function readRequestJson(request: NextRequest) {
  try {
    return (await request.json()) as Partial<ProjectMutationPayload>;
  } catch {
    return {};
  }
}

async function selectOwnedProjects(userId: string) {
  const supabase = getSupabaseAdminClient();
  return runWithMinimumInvestmentFallback((includeMinimumInvestment) =>
    supabase
      .from('projects')
      .select(
        includeMinimumInvestment
          ? PROJECT_SELECT_WITH_MINIMUM_INVESTMENT
          : PROJECT_SELECT_WITHOUT_MINIMUM_INVESTMENT
      )
      .or(`owner_user_id.eq.${userId},owner_id.eq.${userId}`)
      .order('created_at', { ascending: false })
  );
}

async function selectOwnedProjectById(userId: string, projectId: string) {
  const supabase = getSupabaseAdminClient();
  return runWithMinimumInvestmentFallback((includeMinimumInvestment) =>
    supabase
      .from('projects')
      .select(
        includeMinimumInvestment
          ? PROJECT_SELECT_WITH_MINIMUM_INVESTMENT
          : PROJECT_SELECT_WITHOUT_MINIMUM_INVESTMENT
      )
      .eq('id', normalizeProjectFilter(projectId))
      .or(`owner_user_id.eq.${userId},owner_id.eq.${userId}`)
      .maybeSingle()
  );
}

async function insertProject(payload: Record<string, unknown>) {
  const supabase = getSupabaseAdminClient();

  let result = await supabase.from('projects').insert(payload).select('id').maybeSingle();
  if (result.error && isMinimumInvestmentMissingError(result.error)) {
    const fallbackPayload = { ...payload };
    delete (fallbackPayload as { minimum_investment?: number }).minimum_investment;
    result = await supabase.from('projects').insert(fallbackPayload).select('id').maybeSingle();
  }

  return result;
}

async function updateProject(projectId: string, userId: string, payload: Record<string, unknown>) {
  const supabase = getSupabaseAdminClient();

  let result = await supabase
    .from('projects')
    .update(payload)
    .eq('id', normalizeProjectFilter(projectId))
    .or(`owner_user_id.eq.${userId},owner_id.eq.${userId}`)
    .select('id')
    .maybeSingle();

  if (result.error && isMinimumInvestmentMissingError(result.error)) {
    const fallbackPayload = { ...payload };
    delete (fallbackPayload as { minimum_investment?: number }).minimum_investment;
    result = await supabase
      .from('projects')
      .update(fallbackPayload)
      .eq('id', normalizeProjectFilter(projectId))
      .or(`owner_user_id.eq.${userId},owner_id.eq.${userId}`)
      .select('id')
      .maybeSingle();
  }

  return result;
}

function buildProjectPayload({
  body,
  userId,
  existingProject,
}: {
  body: Partial<ProjectMutationPayload>;
  userId: string;
  existingProject?: ProjectRecord | null;
}) {
  const title = coerceString(body.title ?? existingProject?.title);
  const businessName = coerceString(body.business_name ?? existingProject?.business_name);
  const sector = coerceString(body.sector ?? existingProject?.sector);
  const legalRepresentative = coerceString(
    body.legal_representative ?? existingProject?.legal_representative
  );
  const openingDate = coerceString(body.opening_date ?? existingProject?.opening_date);
  const address = coerceString(body.address ?? existingProject?.address);
  const phone = coerceString(body.phone ?? existingProject?.phone);
  const city = coerceString(body.city ?? existingProject?.city);
  const country = coerceString(body.country ?? existingProject?.country);
  const description = coerceString(body.description ?? existingProject?.description);
  const publicationEndDate = coerceString(
    body.publication_end_date ?? existingProject?.publication_end_date
  );
  const currency = coerceString(body.currency ?? existingProject?.currency) || 'USD';
  const amountRequested = coerceNumber(body.amount_requested ?? existingProject?.amount_requested);
  const minimumInvestment = coerceNumber(
    body.minimum_investment ?? existingProject?.minimum_investment
  );
  const installmentCount =
    coercePositiveInteger(body.installment_count ?? body.term_months) ??
    coercePositiveInteger(existingProject?.installment_count ?? existingProject?.term_months);
  const interestRate = coerceNumber(body.interest_rate ?? existingProject?.interest_rate);
  const photoUrls = normalizePhotoUrls(body.photo_urls ?? existingProject?.photo_urls);
  const ownerWallet = coerceNullableString(body.owner_wallet ?? existingProject?.owner_wallet);
  const videoUrl =
    body.video_url === null
      ? null
      : coerceNullableString(body.video_url ?? existingProject?.video_url);
  const nit = body.nit === null ? null : coerceNullableString(body.nit ?? existingProject?.nit);

  const missingFields = [
    title,
    businessName,
    sector,
    legalRepresentative,
    openingDate,
    address,
    phone,
    city,
    country,
    description,
    publicationEndDate,
    currency,
  ].some((value) => value.length === 0);

  if (missingFields) {
    return { error: 'Complete all required project fields.', data: null };
  }

  if (description.length > 2500) {
    return { error: 'Maximum description length: 2500 characters.', data: null };
  }

  if (!amountRequested || amountRequested <= 0) {
    return { error: 'A valid requested amount is required.', data: null };
  }

  if (!minimumInvestment || minimumInvestment <= 0) {
    return { error: 'A valid minimum investment is required.', data: null };
  }

  if (!installmentCount || installmentCount <= 0) {
    return { error: 'Installments must be greater than 0.', data: null };
  }

  if (interestRate == null || interestRate < 0) {
    return { error: 'A valid interest rate is required.', data: null };
  }

  if (photoUrls.length > 10) {
    return { error: 'You can upload up to 10 photos only.', data: null };
  }

  const parsedPublicationEndDate = new Date(publicationEndDate);
  if (Number.isNaN(parsedPublicationEndDate.getTime())) {
    return { error: 'Choose a valid publication end date.', data: null };
  }

  if (parsedPublicationEndDate.getTime() < Date.now()) {
    return { error: 'The publication end date cannot be in the past.', data: null };
  }

  const amountReceived = Number(existingProject?.amount_received ?? 0);
  const nextStatus = existingProject
    ? getNextProjectStatusAfterFunding(existingProject.status, amountReceived)
    : 'published';

  return {
    error: null,
    data: {
      owner_id: userId,
      owner_user_id: userId,
      owner_wallet: ownerWallet,
      title,
      business_name: businessName,
      sector,
      legal_representative: legalRepresentative,
      nit,
      opening_date: openingDate,
      address,
      phone,
      city,
      country,
      description,
      amount_requested: Number(amountRequested.toFixed(2)),
      minimum_investment: Number(minimumInvestment.toFixed(2)),
      amount_received: Number(amountReceived.toFixed(2)),
      currency,
      term_months: installmentCount,
      installment_count: installmentCount,
      publication_end_date: publicationEndDate,
      interest_rate: Number(interestRate.toFixed(2)),
      status: nextStatus,
      photo_urls: photoUrls,
      video_url: videoUrl,
      metadata: {
        ...(existingProject?.metadata ?? {}),
        ...(body.metadata ?? {}),
        publication_end_date: publicationEndDate,
        submitted_from: 'api/me/projects',
      },
    },
  };
}

export async function GET(request: NextRequest) {
  const { error, verified } = await verifyRequiredRequest(request);
  if (error || !verified) return error;

  const projectId = coerceString(request.nextUrl.searchParams.get('projectId'));

  try {
    if (projectId) {
      const { data, error: queryError } = await selectOwnedProjectById(verified.userId, projectId);
      if (queryError) {
        return jsonNoStore(
          { error: 'Could not load your project.', details: queryError.message ?? null },
          { status: 500 }
        );
      }

      return jsonNoStore(
        {
          data: data
            ? normalizeProjectRow(data as unknown as Record<string, unknown>)
            : null,
        },
        { status: 200 }
      );
    }

    const { data, error: queryError } = await selectOwnedProjects(verified.userId);
    if (queryError) {
      return jsonNoStore(
        { error: 'Could not load your projects.', details: queryError.message ?? null },
        { status: 500 }
      );
    }

    return jsonNoStore(
      {
        data: ((data ?? []) as unknown as Record<string, unknown>[]).map(normalizeProjectRow),
      },
      { status: 200 }
    );
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unknown server error.';
    return jsonNoStore({ error: 'Projects request failed.', details: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { error, verified } = await verifyRequiredRequest(request);
  if (error || !verified) return error;

  try {
    const existingProjects = await selectOwnedProjects(verified.userId);
    if (existingProjects.error) {
      return jsonNoStore(
        { error: 'Could not verify your current project state.', details: existingProjects.error.message ?? null },
        { status: 500 }
      );
    }

    if (((existingProjects.data ?? []) as unknown[]).length > 0) {
      return jsonNoStore(
        { error: 'You can only keep one business published at a time.' },
        { status: 409 }
      );
    }

    const body = await readRequestJson(request);
    const payloadResult = buildProjectPayload({ body, userId: verified.userId });
    if (payloadResult.error || !payloadResult.data) {
      return jsonNoStore({ error: payloadResult.error ?? 'Invalid project payload.' }, { status: 400 });
    }

    const insertResult = await insertProject(payloadResult.data);
    if (insertResult.error) {
      return jsonNoStore(
        { error: 'Could not publish the project.', details: insertResult.error.message ?? null },
        { status: 500 }
      );
    }

    const insertedId = String((insertResult.data as { id?: string | number } | null)?.id ?? '');
    const createdProject = await selectOwnedProjectById(verified.userId, insertedId);
    if (createdProject.error) {
      return jsonNoStore(
        { error: 'Project created, but it could not be reloaded.', details: createdProject.error.message ?? null },
        { status: 500 }
      );
    }

    return jsonNoStore(
      {
        data: createdProject.data
          ? normalizeProjectRow(createdProject.data as unknown as Record<string, unknown>)
          : null,
      },
      { status: 200 }
    );
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unknown server error.';
    return jsonNoStore({ error: 'Project write failed.', details: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const { error, verified } = await verifyRequiredRequest(request);
  if (error || !verified) return error;

  const projectId = coerceString(request.nextUrl.searchParams.get('projectId'));
  if (!projectId) {
    return jsonNoStore({ error: 'Missing projectId.' }, { status: 400 });
  }

  try {
    const projectResult = await selectOwnedProjectById(verified.userId, projectId);
    if (projectResult.error) {
      return jsonNoStore(
        { error: 'Could not load your project.', details: projectResult.error.message ?? null },
        { status: 500 }
      );
    }

    const existingProject = projectResult.data
      ? normalizeProjectRow(projectResult.data as unknown as Record<string, unknown>)
      : null;

    if (!existingProject) {
      return jsonNoStore({ error: 'Project not found.' }, { status: 404 });
    }

    const body = await readRequestJson(request);
    const requestedStatus = coerceString(body.status);
    const hasOnlyStatusUpdate =
      requestedStatus.length > 0 &&
      Object.keys(body).every((key) => key === 'status');

    if (hasOnlyStatusUpdate) {
      if (requestedStatus !== 'paused' && requestedStatus !== 'published') {
        return jsonNoStore({ error: 'Unsupported project status.' }, { status: 400 });
      }

      if (requestedStatus === 'paused' && !canPauseProject(existingProject)) {
        return jsonNoStore(
          { error: 'Listings with financing in progress cannot be paused.' },
          { status: 409 }
        );
      }

      const updateResult = await updateProject(projectId, verified.userId, {
        status: requestedStatus,
      });
      if (updateResult.error) {
        return jsonNoStore(
          { error: 'Could not update the project.', details: updateResult.error.message ?? null },
          { status: 500 }
        );
      }
    } else {
      const payloadResult = buildProjectPayload({
        body,
        userId: verified.userId,
        existingProject,
      });
      if (payloadResult.error || !payloadResult.data) {
        return jsonNoStore(
          { error: payloadResult.error ?? 'Invalid project payload.' },
          { status: 400 }
        );
      }

      const updateResult = await updateProject(projectId, verified.userId, payloadResult.data);
      if (updateResult.error) {
        return jsonNoStore(
          { error: 'Could not update the project.', details: updateResult.error.message ?? null },
          { status: 500 }
        );
      }
    }

    const refreshedProject = await selectOwnedProjectById(verified.userId, projectId);
    if (refreshedProject.error) {
      return jsonNoStore(
        { error: 'Project updated, but it could not be reloaded.', details: refreshedProject.error.message ?? null },
        { status: 500 }
      );
    }

    return jsonNoStore(
      {
        data: refreshedProject.data
          ? normalizeProjectRow(refreshedProject.data as unknown as Record<string, unknown>)
          : null,
      },
      { status: 200 }
    );
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unknown server error.';
    return jsonNoStore({ error: 'Project update failed.', details: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const { error, verified } = await verifyRequiredRequest(request);
  if (error || !verified) return error;

  const projectId = coerceString(request.nextUrl.searchParams.get('projectId'));
  if (!projectId) {
    return jsonNoStore({ error: 'Missing projectId.' }, { status: 400 });
  }

  try {
    const projectResult = await selectOwnedProjectById(verified.userId, projectId);
    if (projectResult.error) {
      return jsonNoStore(
        { error: 'Could not load your project.', details: projectResult.error.message ?? null },
        { status: 500 }
      );
    }

    const existingProject = projectResult.data
      ? normalizeProjectRow(projectResult.data as unknown as Record<string, unknown>)
      : null;

    if (!existingProject) {
      return jsonNoStore({ error: 'Project not found.' }, { status: 404 });
    }

    if (!canDeleteProject(existingProject)) {
      return jsonNoStore(
        { error: 'Projects with financing in progress cannot be deleted.' },
        { status: 409 }
      );
    }

    const supabase = getSupabaseAdminClient();
    const { error: deleteError } = await supabase
      .from('projects')
      .delete()
      .eq('id', normalizeProjectFilter(projectId))
      .or(`owner_user_id.eq.${verified.userId},owner_id.eq.${verified.userId}`);

    if (deleteError) {
      return jsonNoStore(
        { error: 'Could not delete the project.', details: deleteError.message ?? null },
        { status: 500 }
      );
    }

    return jsonNoStore({ data: { id: projectId } }, { status: 200 });
  } catch (caughtError) {
    const message = caughtError instanceof Error ? caughtError.message : 'Unknown server error.';
    return jsonNoStore({ error: 'Project delete failed.', details: message }, { status: 500 });
  }
}
