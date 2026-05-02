import { useCallback, useState } from 'react';
import { SignInScreen } from '@/features/auth/components/SignInScreen';
import { AppBootLoading } from '@/shared/components/loading';
import { Toast, type ToastPayload } from '@/shared/components/Toast';
import { useAuth } from '@/features/auth/components/AuthContext';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { useTransactions } from '@/features/transactions/hooks/useTransactions';
import type { User } from '@supabase/supabase-js';
import '@/features/shell/styles/App.css';
import { AnimatePresence } from 'framer-motion';
import { ShellRoutes } from '@/features/shell/ShellRoutes';
import { OfflineBanner } from '@/features/shell/components/OfflineBanner';

const ACCENT = '#0F0F12';

export default function App() {
  const { session, user, loading: authLoading } = useAuth();

  if (authLoading) return <AppBootLoading />;
  if (!session) {
    return (
      <div className="app-shell">
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <SignInScreen />
        </div>
      </div>
    );
  }

  return <AuthedApp user={user} />;
}

function AuthedApp({ user }: { user: User | null }) {
  const {
    profile,
    updateProfile,
    loading: profileLoading,
    error: profileError,
    refetch: refetchProfile,
  } = useProfile();
  const {
    catsExpense,
    catsIncome,
    lists,
    resolveCat,
    addCategory,
    removeCategory,
    updateCategory,
    reorderCategory,
    reordering: categoriesReordering,
    loading: categoriesLoading,
    error: categoriesError,
    refetch: refetchCategories,
  } = useCategories();
  const {
    home,
    addTransaction,
    updateTransaction,
    removeTransaction,
    exportAllTransactions,
    loading: homeLoading,
    error: txnsError,
    refetch: refetchTransactions,
  } = useTransactions();
  const currency = profile?.currency || 'INR';

  const initialDataPending =
    (profileLoading && !profileError) ||
    (categoriesLoading && !categoriesError) ||
    (homeLoading && !txnsError);

  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [retrying, setRetrying] = useState(false);

  const dataErrors = [profileError, categoriesError, txnsError].filter(Boolean) as string[];
  const combinedError = dataErrors.length
    ? dataErrors[0]! + (dataErrors.length > 1 ? ` (+${dataErrors.length - 1} more)` : '')
    : null;

  const handleRetryData = useCallback(async () => {
    setRetrying(true);
    try {
      await Promise.all([refetchProfile(), refetchCategories(), refetchTransactions()]);
    } finally {
      setRetrying(false);
    }
  }, [refetchProfile, refetchCategories, refetchTransactions]);

  const canOpenAdd =
    !categoriesLoading && !categoriesError && (catsExpense.length > 0 || catsIncome.length > 0);

  if (initialDataPending) {
    return <AppBootLoading />;
  }

  const shellProps = {
    user,
    profile,
    updateProfile,
    lists,
    catsExpense,
    catsIncome,
    resolveCat,
    addCategory,
    removeCategory,
    updateCategory,
    reorderCategory,
    categoriesReordering,
    categoriesLoading,
    categoriesError,
    home,
    addTransaction,
    updateTransaction,
    removeTransaction,
    exportAllTransactions,
    currency,
    combinedError,
    retrying,
    onRetryData: handleRetryData,
    canOpenAdd,
    setToast,
  };

  return (
    <>
      <OfflineBanner />
      <ShellRoutes {...shellProps} />
      <AnimatePresence>
        {toast ? <Toast key={toast.id} toast={toast} accent={ACCENT} currency={currency} /> : null}
      </AnimatePresence>
    </>
  );
}
