import type { SupabaseClient } from '@supabase/supabase-js';
import {
  detectInvestmentsSchema,
  loadLegacyInvestmentsForInvestor,
  type LedgerSchemaMode,
} from '@/lib/supabase-ledger-compat';
import { getSupabaseAdminClient } from '@/utils/server/supabase-admin';

export type RoleChangeEligibility = {
  canChangeRole: boolean;
  hasInvestments: boolean;
  hasProjects: boolean;
  investmentCount: number;
  projectCount: number;
  message: string | null;
};

let cachedInvestmentsSchema: 'unknown' | LedgerSchemaMode = 'unknown';

const buildEligibilityMessage = ({
  hasInvestments,
  hasProjects,
}: {
  hasInvestments: boolean;
  hasProjects: boolean;
}) => {
  if (!hasInvestments && !hasProjects) {
    return null;
  }

  if (hasInvestments && hasProjects) {
    return 'You can only change roles when your account has no investments and no published projects.';
  }

  if (hasInvestments) {
    return 'You cannot change roles while your account has investments registered.';
  }

  return 'You cannot change roles while your account still has a published project.';
};

async function getInvestmentsSchema(supabase: SupabaseClient) {
  if (cachedInvestmentsSchema !== 'unknown') {
    return cachedInvestmentsSchema;
  }

  cachedInvestmentsSchema = await detectInvestmentsSchema(supabase);
  return cachedInvestmentsSchema;
}

async function getInvestmentCount(supabase: SupabaseClient, userId: string) {
  const schema = await getInvestmentsSchema(supabase);

  if (schema === 'legacy') {
    const { data, error } = await loadLegacyInvestmentsForInvestor(supabase, userId);
    if (error) {
      throw new Error(error.message);
    }

    return data.length;
  }

  const { count, error } = await supabase
    .from('investments')
    .select('id', { count: 'exact', head: true })
    .eq('investor_user_id', userId);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

async function getProjectCount(supabase: SupabaseClient, userId: string) {
  const { count, error } = await supabase
    .from('projects')
    .select('id', { count: 'exact', head: true })
    .or(`owner_user_id.eq.${userId},owner_id.eq.${userId}`);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function getRoleChangeEligibility(
  userId: string,
  client = getSupabaseAdminClient()
): Promise<RoleChangeEligibility> {
  const [investmentCount, projectCount] = await Promise.all([
    getInvestmentCount(client, userId),
    getProjectCount(client, userId),
  ]);

  const hasInvestments = investmentCount > 0;
  const hasProjects = projectCount > 0;

  return {
    canChangeRole: !hasInvestments && !hasProjects,
    hasInvestments,
    hasProjects,
    investmentCount,
    projectCount,
    message: buildEligibilityMessage({ hasInvestments, hasProjects }),
  };
}
