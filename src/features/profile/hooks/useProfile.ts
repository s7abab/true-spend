import { useCallback, useEffect } from 'react';
import type { User } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as profilesApi from '@/features/profile/api/profiles';
import { useAuth } from '@/features/auth/components/AuthContext';
import { resolveAvatarUrl } from '@/utils/avatar';
import type { ProfileRow } from '@/features/profile/types';
import { queryKeys } from '@/shared/lib/queryKeys';

async function fetchOrCreateProfile(userId: string, user: User): Promise<ProfileRow> {
  const first = await profilesApi.fetchProfile(userId);
  if (first.error) throw first.error;
  let data = first.data as ProfileRow | null;
  if (!data) {
    const row = profilesApi.profileRowFromUser(user);
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
