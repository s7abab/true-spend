import { supabase } from '../lib/supabase';

export async function listCategories(userId) {
  return supabase
    .from('categories')
    .select('id, kind, label, icon, tint, sort_order, is_archived')
    .eq('user_id', userId)
    .eq('is_archived', false)
    .order('kind', { ascending: true })
    .order('sort_order', { ascending: true });
}

export async function insertCategory(row) {
  return supabase.from('categories').insert(row).select().maybeSingle();
}

export async function updateCategoryRow(userId, id, patch) {
  return supabase
    .from('categories')
    .update(patch)
    .eq('id', id)
    .eq('user_id', userId)
    .select()
    .maybeSingle();
}

export async function deleteCategoryRow(userId, id) {
  return supabase.from('categories').delete().eq('id', id).eq('user_id', userId);
}
