/** Centralized TanStack Query keys for consistent invalidation and typing. */
export const queryKeys = {
  profile: (userId: string) => ['profile', userId] as const,
  categories: (userId: string) => ['categories', userId] as const,
  transactions: {
    /** Prefix: invalidates home, history, stats, and any future transaction queries. */
    root: ['transactions'] as const,
    home: (userId: string, tz: string) => ['transactions', 'home', userId, tz] as const,
    history: (userId: string, kind: string, search: string) =>
      ['transactions', 'history', userId, kind, search] as const,
    stats: (userId: string, rangeKey: string) => ['transactions', 'stats', userId, rangeKey] as const,
  },
} as const;
