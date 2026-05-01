import type { User } from '@supabase/supabase-js';
import { supabase } from '@/shared/lib/supabase';
import type { ProfileRow } from '@/features/profile/types';

export function profileRowFromUser(user: User | null | undefined): ProfileRow | null {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email ?? null,
    full_name: (user.user_metadata?.full_name as string | undefined)
      ?? (user.user_metadata?.name as string | undefined)
      ?? null,
    avatar_url: (user.user_metadata?.avatar_url as string | undefined)
      ?? (user.user_metadata?.picture as string | undefined)
      ?? null,
    currency: 'INR',
  };
}

export async function fetchProfile(userId: string) {
  return supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
}

export async function insertProfile(row: ProfileRow) {
  return supabase.from('profiles').insert(row).select().maybeSingle();
}

export async function updateProfile(userId: string, patch: Partial<ProfileRow>) {
  return supabase.from('profiles').update(patch).eq('id', userId).select().maybeSingle();
}
