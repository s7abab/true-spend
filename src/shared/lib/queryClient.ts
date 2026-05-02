import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 30 * 60 * 1000,
      retry: 1,
      // Cuts background work when returning to the tab; data still refetches when stale on mount.
      refetchOnWindowFocus: false,
    },
  },
});
