import { supabase } from '../lib/supabase';

export function profileRowFromUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    full_name:
      user.user_metadata?.full_name
      ?? user.user_metadata?.name
      ?? null,
    avatar_url:
      user.user_metadata?.avatar_url
      ?? user.user_metadata?.picture
      ?? null,
    currency: 'INR',
  };
}

export async function fetchProfile(userId) {
  return supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
}

export async function insertProfile(row) {
  return supabase.from('profiles').insert(row).select().maybeSingle();
}

export async function updateProfile(userId, patch) {
  return supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select()
    .maybeSingle();
}
