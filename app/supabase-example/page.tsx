import { createClient } from '@/utils/supabase/server';
import { getTranslations } from 'next-intl/server';

type Todo = {
  id: string | number;
  name: string;
};

export default async function SupabaseExamplePage() {
  const t = await getTranslations('SupabaseExample');
  const supabase = await createClient();
  const { data, error } = await supabase.from('todos').select('id,name').limit(20);
  const todos = (data ?? []) as Todo[];

  return (
    <main className="min-h-screen px-6 py-10 text-gray-900">
      <div className="mx-auto max-w-xl rounded-[28px] border border-white/25 bg-white/20 p-6 shadow-[0_12px_30px_rgba(15,23,42,0.08)] backdrop-blur-md">
        <h1 className="text-2xl font-semibold">{t('title')}</h1>
        <p className="mt-2 text-sm text-gray-600">
          {t('descriptionPrefix')} <code>todos</code> {t('descriptionSuffix')}
        </p>

        {error ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
            {t('loadErrorPrefix')} <code>todos</code>: {error.message}
          </div>
        ) : (
          <ul className="mt-6 space-y-3">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className="rounded-2xl border border-white/30 bg-white/70 px-4 py-3 text-sm shadow-[0_8px_24px_rgba(15,23,42,0.06)]"
              >
                {todo.name}
              </li>
            ))}
          </ul>
        )}

        {!error && todos.length === 0 ? (
          <p className="mt-6 text-sm text-gray-500">{t('empty')}</p>
        ) : null}
      </div>
    </main>
  );
}
