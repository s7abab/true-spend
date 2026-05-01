import { useCallback, useEffect, useState } from 'react';
import * as profilesApi from '@/features/profile/api/profiles';
import { useAuth } from '@/features/auth/components/AuthContext';
import { resolveAvatarUrl } from '@/utils/avatar';
import type { ProfileRow } from '@/features/profile/types';

function errMessage(e: unknown): string {
  if (!e) return 'Something went wrong';
  if (typeof e === 'object' && e !== null && 'message' in e && typeof (e as Error).message === 'string' && (e as Error).message) {
    return (e as Error).message;
  }
  return String(e);
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      let { data, error: qErr } = await profilesApi.fetchProfile(user.id);
      if (qErr) throw qErr;
      if (!data) {
        const row = profilesApi.profileRowFromUser(user);
        if (row) {
          const ins = await profilesApi.insertProfile(row);
          if (ins.error) console.warn('profile bootstrap insert', ins.error);
        }
        const again = await profilesApi.fetchProfile(user.id);
        if (again.error) throw again.error;
        data = again.data as ProfileRow | null;
      }
      setProfile(data as ProfileRow);
    } catch (e) {
      console.error('profile load', e);
      setProfile(null);
      setError(errMessage(e));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user?.id || !profile?.id) return;
    if (profile.avatar_url) return;
    const url = resolveAvatarUrl(null, user);
    if (!url) return;
    let cancelled = false;
    void profilesApi.updateProfile(user.id, { avatar_url: url }).then(({ data, error: upErr }) => {
      if (cancelled || upErr || !data) return;
      setProfile(data as ProfileRow);
    });
    return () => {
      cancelled = true;
    };
  }, [user, profile?.id, profile?.avatar_url]);

  const updateProfile = useCallback(
    async (patch: Partial<ProfileRow>) => {
      if (!user) return { error: new Error('not signed in') as Error, data: null };
      const { data, error: upErr } = await profilesApi.updateProfile(user.id, patch);
      if (!upErr && data) setProfile(data as ProfileRow);
      return { data, error: upErr };
    },
    [user],
  );

  return { profile, loading, error, refetch: load, updateProfile };
}
