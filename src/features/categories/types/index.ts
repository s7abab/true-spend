import type { TransactionKind } from '@/types/ledger';

export type CategoryRow = {
  id: string;
  kind: TransactionKind | string;
  label: string;
  icon: string;
  tint: string;
  sort_order: number;
  is_archived: boolean;
};

export type CategoryIconKey = string;
