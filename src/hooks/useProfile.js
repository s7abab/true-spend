import { useCallback, useEffect, useState } from 'react';
import * as profilesApi from '../api/profiles';
import { useAuth } from '../context/AuthContext';
import { resolveAvatarUrl } from '../utils/avatar';

export function useProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(Boolean(user));

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return undefined;
    }
    let active = true;
    setLoading(true);

    (async () => {
      let { data, error } = await profilesApi.fetchProfile(user.id);
      if (!active) return;
      if (error) {
        console.error('profile fetch failed', error);
        setProfile(null);
        setLoading(false);
        return;
      }
      if (!data) {
        const row = profilesApi.profileRowFromUser(user);
        const ins = await profilesApi.insertProfile(row);
        if (!active) return;
        if (ins.error) console.error('profile insert (bootstrap)', ins.error);
        const again = await profilesApi.fetchProfile(user.id);
        if (!active) return;
        data = again.data;
        if (again.error) console.error('profile bootstrap refetch failed', again.error);
      }
      setProfile(data);
      setLoading(false);
    })();

    return () => {
      active = false;
    };
  }, [user]);

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

  return { profile, loading, updateProfile };
}
