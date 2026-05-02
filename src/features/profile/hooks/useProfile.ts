import { useCallback, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as profilesApi from '@/features/profile/api/profiles';
import { useAuth } from '@/features/auth/components/AuthContext';
import { resolveAvatarUrl } from '@/utils/avatar';
import type { ProfileRow } from '@/features/profile/types';
import { queryKeys } from '@/shared/lib/queryKeys';
import { inferCurrencyFromLocation } from '@/utils/inferCurrency';

async function fetchOrCreateProfile(userId: string, user: User): Promise<ProfileRow> {
  const first = await profilesApi.fetchProfile(userId);
  if (first.error) throw first.error;
  let data = first.data as ProfileRow | null;
  if (!data) {
    let initialCurrency: string | null = null;
    try {
      initialCurrency = await inferCurrencyFromLocation();
    } catch {
      /* keep null → INR in profileRowFromUser */
    }
    const row = profilesApi.profileRowFromUser(user, initialCurrency);
    if (row) {
      const ins = await profilesApi.insertProfile(row);
      if (ins.error) console.warn('profile bootstrap insert', ins.error);
    }
    const again = await profilesApi.fetchProfile(userId);
    if (again.error) throw again.error;
    data = again.data as ProfileRow | null;
  }
  if (!data) throw new Error('Profile could not be loaded');
  return data;
}

export function useProfile() {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const qc = useQueryClient();

  const profileQuery = useQuery({
    queryKey: userId ? queryKeys.profile(userId) : ['profile', 'idle'],
    enabled: Boolean(userId) && Boolean(user),
    queryFn: () => fetchOrCreateProfile(userId!, user!),
  });

  const profile = profileQuery.data ?? null;

  useEffect(() => {
    if (!user?.id || !profile?.id) return;
    if (profile.avatar_url) return;
    const url = resolveAvatarUrl(null, user);
    if (!url) return;
    let cancelled = false;
    void profilesApi.updateProfile(user.id, { avatar_url: url }).then(({ data, error: upErr }) => {
      if (cancelled || upErr || !data) return;
      qc.setQueryData(queryKeys.profile(user.id), data as ProfileRow);
    });
    return () => {
      cancelled = true;
    };
  }, [user, profile?.id, profile?.avatar_url, qc]);

  /** One-time: align DB default INR with IP/locale when the user is clearly elsewhere. */
  useEffect(() => {
    if (!user?.id || !profile?.id) return;
    const key = `truspend_geo_currency_v1:${user.id}`;
    try {
      if (localStorage.getItem(key)) return;
    } catch {
      /* ignore */
    }

    let cancelled = false;
    void (async () => {
      const inferred = await inferCurrencyFromLocation();
      if (cancelled || !inferred) return;

      const current = (profile.currency || 'INR').toUpperCase();
      if (current === 'INR' && inferred !== 'INR') {
        const out = await profilesApi.updateProfile(user.id, { currency: inferred });
        if (cancelled || out.error) return;
        if (out.data) qc.setQueryData(queryKeys.profile(user.id), out.data as ProfileRow);
      }

      try {
        localStorage.setItem(key, '1');
      } catch {
        /* ignore */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, profile?.id, profile?.currency, qc]);

  const updateMutation = useMutation({
    mutationFn: async ({ uid, patch }: { uid: string; patch: Partial<ProfileRow> }) => {
      const out = await profilesApi.updateProfile(uid, patch);
      if (out.error) throw out.error;
      return out.data as ProfileRow;
    },
    onSuccess: (data, { uid }) => {
      qc.setQueryData(queryKeys.profile(uid), data);
    },
  });

  const updateProfile = useCallback(
    async (patch: Partial<ProfileRow>) => {
      if (!user) return { error: new Error('not signed in') as Error, data: null };
      try {
        const data = await updateMutation.mutateAsync({ uid: user.id, patch });
        return { data, error: null as null };
      } catch (e) {
        return { data: null, error: e instanceof Error ? e : new Error(String(e)) };
      }
    },
    [user, updateMutation],
  );

  const errorMsg =
    profileQuery.error instanceof Error
      ? profileQuery.error.message
      : profileQuery.error
        ? String(profileQuery.error)
        : null;

  return {
    profile,
    loading: profileQuery.isPending,
    error: errorMsg,
    refetch: profileQuery.refetch,
    updateProfile,
  };
}
