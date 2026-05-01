import type { User } from '@supabase/supabase-js';
import type { ProfileRow } from '@/features/profile/types';

type IdentityData = { picture?: string; avatar_url?: string };

/**
 * Google (and other OIDC) often expose the photo as `picture`, while Supabase
 * may mirror it as `avatar_url`. Check both plus `identities` payload.
 */
export function resolveAvatarUrl(profile: ProfileRow | null | undefined, user: User | null | undefined): string | null {
  if (!user && !profile) return null;
  const meta = user?.user_metadata ?? {};
  const fromIdentity = user?.identities?.find((i) => i.provider === 'google')?.identity_data as
    | IdentityData
    | undefined;
  return (
    profile?.avatar_url
    || (meta.avatar_url as string | undefined)
    || (meta.picture as string | undefined)
    || fromIdentity?.picture
    || fromIdentity?.avatar_url
    || null
  );
}
