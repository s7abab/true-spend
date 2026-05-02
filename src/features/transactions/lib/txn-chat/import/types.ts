/** One compact table extracted from CSV / sheet / PDF heuristics. */
export type ParsedImportTable = {
  headers: string[];
  /** Data rows aligned to headers (same length per row). */
  rows: string[][];
};

export type ImportColumnMapRequest = {
  headers: string[];
  /** 1–2 sample data rows (strings only, truncated upstream). */
  sampleRows: string[][];
  currency: string;
};

/** Maps file column **titles** (exact header strings) to roles; null = unused. */
export type ImportColumnMapping = {
  date: string | null;
  title: string | null;
  amount: string | null;
  kind: string | null;
  note: string | null;
  category_hint: string | null;
};

export type ImportColumnMapResult = {
  reply: string;
  mapping: ImportColumnMapping;
  default_kind: 'expense' | 'income' | 'transfer';
};
