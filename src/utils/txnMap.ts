import { formatDateLabel } from '@/utils/dateLabel';
import type { TransactionKind } from '@/types/ledger';

export type DbTransactionRow = {
  id: string;
  kind: string;
  category_id: string | null;
  amount: number | string;
  title?: string | null;
  note?: string | null;
  occurred_at?: string | null;
};

export type MappedTxn = {
  id: string;
  kind: TransactionKind;
  cat: string | null;
  amount: number;
  title: string;
  note: string;
  occurred_at: string | undefined;
  occurredDate: Date;
  time: string;
};

export function mapTxnRow(row: DbTransactionRow): MappedTxn {
  const occurredAt = row.occurred_at ? new Date(row.occurred_at) : new Date();
  return {
    id: row.id,
    kind:
      row.kind === 'income' ? 'income' : row.kind === 'transfer' ? 'transfer' : 'expense',
    cat: row.category_id,
    amount: Number(row.amount),
    title: row.title || '',
    note: row.note || '',
    occurred_at: row.occurred_at ?? undefined,
    occurredDate: occurredAt,
    time: formatDateLabel(occurredAt),
  };
}
