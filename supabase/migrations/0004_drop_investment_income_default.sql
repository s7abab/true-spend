-- Remove legacy default income category "Investment" (investment flows belong under transfer / other income labels).
-- Safe: transactions reference categories with ON DELETE SET NULL.

delete from public.categories
where kind = 'income'
  and label = 'Investment';
