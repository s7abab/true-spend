export type CategoryAggRow = {
  category_id: string | null;
  total: number | string;
  txn_count?: number | string;
};

export type PeriodSummary = {
  total_income: number;
  total_expense: number;
  income_txn_count: number;
  expense_txn_count: number;
};

export type PeriodTrendPoint = {
  key: string;
  expense: number;
  income: number;
};
