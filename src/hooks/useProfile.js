import { useCallback, useEffect, useState } from 'react';
import * as profilesApi from '../api/profiles';
import { useAuth } from '../context/AuthContext';
import { resolveAvatarUrl } from '../utils/avatar';

function errMessage(e) {
  if (!e) return 'Something went wrong';
  if (typeof e.message === 'string' && e.message) return e.message;
  return String(e);
}

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(user));
  const [error, setError] = useState(null);

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
        const ins = await profilesApi.insertProfile(row);
        if (ins.error) console.warn('profile bootstrap insert', ins.error);
        const again = await profilesApi.fetchProfile(user.id);
        if (again.error) throw again.error;
        data = again.data;
      }
      setProfile(data);
    } catch (e) {
      console.error('profile load', e);
      setProfile(null);
      setError(errMessage(e));
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  /** Backfill `profiles.avatar_url` from Google `picture` when the row exists but photo is empty. */
  useEffect(() => {
    if (!user?.id || !profile?.id) return;
    if (profile.avatar_url) return;
    const url = resolveAvatarUrl(null, user);
    if (!url) return;
    let cancelled = false;
    profilesApi.updateProfile(user.id, { avatar_url: url }).then(({ data, error }) => {
      if (cancelled || error || !data) return;
      setProfile(data);
    });
    return () => { cancelled = true; };
  }, [user, profile?.id, profile?.avatar_url]);

  const updateProfile = useCallback(async (patch) => {
    if (!user) return { error: new Error('not signed in') };
    const { data, error } = await profilesApi.updateProfile(user.id, patch);
    if (!error && data) setProfile(data);
    return { data, error };
  }, [user]);

  return { profile, loading, error, refetch: load, updateProfile };
}
