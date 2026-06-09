import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  InternalLedgerEntry,
  InternalLedgerProjectionPayload,
  InternalLedgerProjectionTable,
} from '@/utils/internal-ledger/types';

type ProjectionClient = SupabaseClient;

const getProjectionRowId = (payload: InternalLedgerProjectionPayload) =>
  typeof payload.row.id === 'string' || typeof payload.row.id === 'number'
    ? payload.row.id
    : null;

export const getProjectionRow = (payload: InternalLedgerProjectionPayload) => payload.row;

export const getProjectionTable = (payload: InternalLedgerProjectionPayload) => payload.table;

export const buildProjectionPayload = (
  table: InternalLedgerProjectionTable,
  row: Record<string, unknown>,
  conflictTarget = 'id',
  operation: 'upsert' | 'delete' = 'upsert'
): InternalLedgerProjectionPayload => ({
  table,
  conflict_target: conflictTarget,
  row,
  operation,
});

export async function syncInternalLedgerProjection(
  supabase: ProjectionClient,
  entry: Pick<InternalLedgerEntry, 'projection_payload'>
) {
  const payload = entry.projection_payload;
  const rowId = getProjectionRowId(payload);

  if (payload.operation === 'delete') {
    if (!rowId) return;

    const { error } = await supabase.from(payload.table).delete().eq(payload.conflict_target, rowId);
    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await supabase
    .from(payload.table)
    .upsert(payload.row, { onConflict: payload.conflict_target });

  if (error) {
    throw new Error(error.message);
  }
}

export async function syncInternalLedgerProjectionsForUser(
  supabase: ProjectionClient,
  entries: Array<Pick<InternalLedgerEntry, 'projection_payload'>>
) {
  for (const entry of entries) {
    await syncInternalLedgerProjection(supabase, entry);
  }
}
