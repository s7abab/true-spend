/** Centralized TanStack Query keys for consistent invalidation and typing. */
export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  categories: (userId: string) => ['categories', userId] as const,
  transactions: {
    /** Prefix: invalidates home, history, stats, and any future transaction queries. */
    root: ['transactions'] as const,
    home: (userId: string, tz: string) => ['transactions', 'home', userId, tz] as const,
    history: (userId: string, fingerprint: string) =>
      ['transactions', 'history', userId, fingerprint] as const,
    stats: (userId: string, rangeKey: string, breakdownKind: 'expense' | 'income' = 'expense') =>
      ['transactions', 'stats', userId, rangeKey, breakdownKind] as const,
    periodSummary: (userId: string, rangeKey: string) =>
      ['transactions', 'periodSummary', userId, rangeKey] as const,
    periodTrend: (userId: string, rangeKey: string, bucket: 'hour' | 'day' | 'month', tz: string) =>
      ['transactions', 'periodTrend', userId, rangeKey, bucket, tz] as const,
    reportDetail: (userId: string, fingerprint: string, search: string) =>
      ['transactions', 'reportDetail', userId, fingerprint, search] as const,
  },
} as const;
