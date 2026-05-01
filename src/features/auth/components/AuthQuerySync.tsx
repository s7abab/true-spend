import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/features/auth/components/AuthContext';

/** Clears server-state cache when the user signs out so data never leaks across sessions. */
export function AuthQuerySync() {
  const { session, loading } = useAuth();
  const qc = useQueryClient();

  useEffect(() => {
    if (!loading && !session) {
      qc.clear();
    }
  }, [loading, session, qc]);

  return null;
}
