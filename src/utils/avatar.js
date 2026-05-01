/**
 * Google (and other OIDC) often expose the photo as `picture`, while Supabase
 * may mirror it as `avatar_url`. Check both plus `identities` payload.
 */
export function resolveAvatarUrl(profile, user) {
  if (!user && !profile) return null;
  const meta = user?.user_metadata ?? {};
  const fromIdentity = user?.identities?.find?.((i) => i.provider === 'google')?.identity_data;
  return (
    profile?.avatar_url
    || meta.avatar_url
    || meta.picture
    || fromIdentity?.picture
    || fromIdentity?.avatar_url
    || null
  );
}
