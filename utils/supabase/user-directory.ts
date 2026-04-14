import type { SupabaseClient } from '@supabase/supabase-js';

const shouldFallbackToUsersTable = (message: string | undefined) => {
  const normalized = (message ?? '').toLowerCase();
  return (
    normalized.includes('user_directory') ||
    normalized.includes('schema cache') ||
    normalized.includes('does not exist') ||
    normalized.includes('relation') ||
    normalized.includes('not found')
  );
};

export async function runUserDirectoryQuery<T>(
  supabase: SupabaseClient<any, 'public', any>,
  buildQuery: (source: 'user_directory' | 'users') => PromiseLike<T>
): Promise<T> {
  const result = await buildQuery('user_directory');
  const error = (result as { error?: { message?: string } | null }).error;

  if (!error || !shouldFallbackToUsersTable(error.message)) {
    return result;
  }

  return buildQuery('users');
}
