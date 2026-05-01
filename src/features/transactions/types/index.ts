import type { MappedTxn } from '@/utils/txnMap';

export type { MappedTxn };

export type HomeMetrics = {
  lifetimeIncome: number;
  lifetimeExpense: number;
  weekBuckets: number[];
  prevWeekExpense: number;
  recentTxns: MappedTxn[];
};

export type InsertTransactionInput = {
  kind: string;
  category_id: string | null;
  amount: number;
  title: string;
  note: string | null;
  occurred_at: string;
};
