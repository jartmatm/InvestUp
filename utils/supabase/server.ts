import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseEnv } from '@/utils/supabase/config';

export type SupabaseCookieStore = Awaited<ReturnType<typeof cookies>>;

export async function createClient(cookieStore?: SupabaseCookieStore) {
  const resolvedCookieStore = cookieStore ?? (await cookies());
  const { supabaseUrl, supabasePublishableKey } = getSupabaseEnv();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return resolvedCookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            resolvedCookieStore.set(name, value, options)
          );
        } catch {
          // Server Components cannot always mutate cookies directly.
          // The proxy refresh flow will persist auth cookies when needed.
        }
      },
    },
  });
}
