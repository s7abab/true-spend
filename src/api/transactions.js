import { supabase } from '../lib/supabase';

export async function listTransactions(userId) {
  return supabase
    .from('transactions')
    .select('id, kind, category_id, amount, title, note, occurred_at')
    .eq('user_id', userId)
    .order('occurred_at', { ascending: false });
}

export async function insertTransaction(row) {
  return supabase.from('transactions').insert(row).select().maybeSingle();
}

export async function deleteTransactionRow(userId, id) {
  return supabase.from('transactions').delete().eq('id', id).eq('user_id', userId);
}
