import { supabase } from '@/shared/lib/supabase';

type CategoryInsert = {
  user_id: string;
  kind: string;
  label: string;
  icon: string;
  tint: string;
  sort_order: number;
};

type CategoryPatch = { label: string; icon: string };

export async function listCategories(userId: string) {
  return supabase
    .from('categories')
    .select('id, kind, label, icon, tint, sort_order, is_archived')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('kind', { ascending: true })
    .order('sort_order', { ascending: true });
}

export async function insertCategory(row: CategoryInsert) {
  return supabase.from('categories').insert(row).select().maybeSingle();
}

export async function updateCategoryRow(userId: string, id: string, patch: CategoryPatch) {
  return supabase
    .from('categories')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .maybeSingle();
}

export async function deleteCategoryRow(userId: string, id: string) {
  return supabase.from('categories').delete().eq('id', id).eq('user_id', userId);
}
