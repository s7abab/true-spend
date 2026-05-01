import { formatDateLabel } from '../data/categories';

export function mapTxnRow(row) {
  const occurredAt = row.occurred_at ? new Date(row.occurred_at) : new Date();
  return {
    id: row.id,
    kind: row.kind,
    cat: row.category_id,
    amount: Number(row.amount),
    title: row.title || '',
    note: row.note || '',
    occurred_at: row.occurred_at,
    occurredDate: occurredAt,
    time: formatDateLabel(occurredAt),
  };
}
