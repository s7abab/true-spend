import { useState, useCallback, useEffect, type ComponentType } from 'react';
import type { MappedTxn } from '@/utils/txnMap';
import { AnimatePresence, motion } from 'framer-motion';
import { HomeScreen } from '@/features/transactions/components/HomeScreen';
import { StatsScreen } from '@/features/stats/components/StatsScreen';
import { HistoryScreen } from '@/features/history/components/HistoryScreen';
import { ProfileScreen } from '@/features/profile/components/ProfileScreen';
import { AddTransactionScreen } from '@/features/transactions/components/AddTransactionScreen';
import { SMOOTH_DECEL } from '@/shared/motion/sheetMotion';
import { CategoriesScreen } from '@/features/categories/components/CategoriesScreen';
import { SignInScreen } from '@/features/auth/components/SignInScreen';
import { AppTopBar } from '@/shared/components/AppTopBar';
import { Toast, type ToastPayload } from '@/shared/components/Toast';
import { DataErrorBanner } from '@/shared/components/DataErrorBanner';
import { useAuth } from '@/features/auth/components/AuthContext';
import { useProfile } from '@/features/profile/hooks/useProfile';
import { useCategories } from '@/features/categories/hooks/useCategories';
import { useTransactions } from '@/features/transactions/hooks/useTransactions';
import { IHome, IChart, IList, IUser, IPlus, IChevLeft } from '@/shared/components/Icons';
import type { ProfileRow } from '@/features/profile/types';
import type { User } from '@supabase/supabase-js';
import '@/features/shell/styles/App.css';
import type { TabId } from '@/features/shell/types/navigation';
import {
  pathnameForTab,
  shouldReplacePathname,
  tabFromPathname,
} from '@/features/shell/lib/tabRoutes';

const ACCENT = '#0F0F12';

type TabDef = { id: TabId; label: string; Icon: ComponentType<{ size?: number; stroke?: number }> };

// Categories is no longer a tab — it lives under Profile as a sub-screen
const TABS: (TabDef | null)[] = [
  { id: 'home', label: 'Home', Icon: IHome },
  { id: 'stats', label: 'Stats', Icon: IChart },
  null, // FAB
  { id: 'history', label: 'History', Icon: IList },
  { id: 'profile', label: 'Profile', Icon: IUser },
];

function firstName(profile: ProfileRow | null | undefined, user: User | null | undefined): string {
  const full =
    profile?.full_name
    || (user?.user_metadata?.full_name as string | undefined)
    || (user?.user_metadata?.name as string | undefined)
    || '';
  if (full) return full.split(/\s+/)[0] ?? 'there';
  if (user?.email) return user.email.split('@')[0] ?? 'there';
  return 'there';
}

function greetingLine(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function Splash() {
  return (
    <div className="app-shell" style={{ alignItems: 'center', justifyContent: 'center' }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25 }}
        style={{ color: '#ACACB8', fontSize: 13, fontWeight: 500 }}
      >
        Loading…
      </motion.div>
    </div>
  );
}

export default function App() {
  const { session, user, loading: authLoading } = useAuth();

  if (authLoading) return <Splash />;
  if (!session) {
    return (
      <div className="app-shell">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3 }}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
        >
          <SignInScreen />
        </motion.div>
      </div>
    );
  }

  return <AuthedApp user={user} />;
}

function AuthedApp({ user }: { user: User | null }) {
  const { profile, updateProfile, error: profileError, refetch: refetchProfile } = useProfile();
  const {
    catsExpense,
    catsIncome,
    lists,
    resolveCat,
    addCategory,
    removeCategory,
    updateCategory,
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
    error: txnsError,
    refetch: refetchTransactions,
  } = useTransactions();
  const currency = profile?.currency || 'INR';

  const [tab, setTab] = useState<TabId>(() => {
    if (typeof window === 'undefined') return 'home';
    const path = window.location.pathname;
    const t = tabFromPathname(path);
    if (shouldReplacePathname(path, t)) {
      window.history.replaceState(null, '', pathnameForTab(t));
    }
    return t;
  });
  const [adding, setAdding] = useState(false);
  const [editingTxn, setEditingTxn] = useState<MappedTxn | null>(null);
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const [savingTxn, setSavingTxn] = useState(false);
  const [deletingTxn, setDeletingTxn] = useState(false);
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

  const navigateToTab = useCallback((next: TabId) => {
    const nextPath = pathnameForTab(next);
    if (window.location.pathname !== nextPath) {
      window.history.pushState(null, '', nextPath);
    }
    setTab(next);
  }, []);

  useEffect(() => {
    const onPopState = () => {
      const path = window.location.pathname;
      const t = tabFromPathname(path);
      setTab(t);
      if (shouldReplacePathname(path, t)) {
        window.history.replaceState(null, '', pathnameForTab(t));
      }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const canOpenAdd =
    !categoriesLoading && !categoriesError && (catsExpense.length > 0 || catsIncome.length > 0);

  const closeTxnSheet = () => {
    if (!savingTxn && !deletingTxn) {
      setAdding(false);
      setEditingTxn(null);
    }
  };

  const openEditTxn = useCallback(
    (txn: MappedTxn) => {
      if (!canOpenAdd) {
        const msg = categoriesLoading
          ? 'Still loading categories…'
          : categoriesError
            ? 'Fix the data connection, then try again.'
            : 'Add at least one category first (Categories tab).';
        setToast({ id: Date.now(), kind: 'error', message: msg });
        setTimeout(() => setToast(null), 3200);
        return;
      }
      setEditingTxn(txn);
      setAdding(true);
    },
    [canOpenAdd, categoriesLoading, categoriesError],
  );

  const onSaveTxn = async (t: {
    kind: string;
    category_id: string | null;
    amount: number;
    title: string;
    note: string | null;
    occurred_at: string;
  }) => {
    setSavingTxn(true);
    try {
      if (editingTxn) {
        const res = await updateTransaction(editingTxn.id, {
          kind: t.kind,
          category_id: t.category_id,
          amount: t.amount,
          title: t.title,
          note: t.note,
          occurred_at: t.occurred_at,
        });
        if (res.error) {
          const msg = res.error.message || 'Could not update transaction';
          console.error('updateTransaction failed', res.error);
          setToast({ id: Date.now(), kind: 'error', message: msg });
          setTimeout(() => setToast(null), 4200);
          return;
        }
        setAdding(false);
        setEditingTxn(null);
        setToast({ id: Date.now(), kind: 'done', message: 'Transaction updated' });
        setTimeout(() => setToast(null), 2600);
        return;
      }

      const res = await addTransaction({
        kind: t.kind,
        category_id: t.category_id,
        amount: t.amount,
        title: t.title,
        note: t.note,
        occurred_at: t.occurred_at,
      });
      if (res.error) {
        const msg = res.error.message || 'Could not save transaction';
        console.error('addTransaction failed', res.error);
        setToast({ id: Date.now(), kind: 'error', message: msg });
        setTimeout(() => setToast(null), 4200);
        return;
      }
      setAdding(false);
      setToast({
        id: Date.now(),
        kind: t.kind === 'income' ? 'income' : 'expense',
        amount: t.amount,
      });
      setTimeout(() => setToast(null), 2400);
    } finally {
      setSavingTxn(false);
    }
  };

  const onDeleteTxn = async () => {
    if (!editingTxn) return;
    setDeletingTxn(true);
    try {
      const res = await removeTransaction(editingTxn.id);
      if (res.error) {
        const msg = res.error.message || 'Could not delete transaction';
        console.error('removeTransaction failed', res.error);
        setToast({ id: Date.now(), kind: 'error', message: msg });
        setTimeout(() => setToast(null), 4200);
        return;
      }
      setAdding(false);
      setEditingTxn(null);
      setToast({ id: Date.now(), kind: 'done', message: 'Transaction deleted' });
      setTimeout(() => setToast(null), 2600);
    } finally {
      setDeletingTxn(false);
    }
  };

  const openAdd = () => {
    if (!canOpenAdd) {
      const msg = categoriesLoading
        ? 'Still loading categories…'
        : categoriesError
          ? 'Fix the data connection, then try again.'
          : 'Add a category first (Profile → Categories).';
      setToast({ id: Date.now(), kind: 'error', message: msg });
      setTimeout(() => setToast(null), 3200);
      return;
    }
    setEditingTxn(null);
    setAdding(true);
  };

  const screen = {
    home: (
      <HomeScreen
        income={home.lifetimeIncome}
        expense={home.lifetimeExpense}
        weekBuckets={home.weekBuckets}
        prevWeekExpense={home.prevWeekExpense}
        recentTxns={home.recentTxns}
        accent={ACCENT}
        resolveCat={resolveCat}
        currency={currency}
        onSeeAll={() => navigateToTab('history')}
        onTxnPress={openEditTxn}
      />
    ),
    stats: (
      <StatsScreen
        categoriesExpense={catsExpense}
        categoriesIncome={catsIncome}
        resolveCat={resolveCat}
        currency={currency}
        onTxnPress={openEditTxn}
      />
    ),
    history: (
      <HistoryScreen
        resolveCat={resolveCat}
        categoriesExpense={catsExpense}
        categoriesIncome={catsIncome}
        currency={currency}
        onTxnPress={openEditTxn}
      />
    ),
    categories: (
      <CategoriesScreen
        accent={ACCENT}
        lists={lists}
        onAdd={addCategory}
        onRemove={removeCategory}
        onUpdate={updateCategory}
      />
    ),
    profile: (
      <ProfileScreen
        profile={profile}
        user={user}
        updateProfile={updateProfile}
        lists={lists}
        onExportTransactions={exportAllTransactions}
        onGoToCategories={() => navigateToTab('categories')}
      />
    ),
  }[tab];

  const mainContent = adding ? (
    <AddTransactionScreen
      key={editingTxn?.id ?? 'add-page'}
      accent={ACCENT}
      categoriesExpense={catsExpense}
      categoriesIncome={catsIncome}
      currency={currency}
      saving={savingTxn}
      deleting={deletingTxn}
      initialTxn={editingTxn}
      onDelete={editingTxn ? () => void onDeleteTxn() : undefined}
      onClose={closeTxnSheet}
      onSave={onSaveTxn}
      asPage
    />
  ) : (
    screen
  );

  // Categories is a sub-screen of Profile — highlight Profile tab and show a back button
  const effectiveActiveTab: TabId = tab === 'categories' ? 'profile' : tab;

  const topBarContent =
    tab === 'categories' ? (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button
          type="button"
          onClick={() => navigateToTab('profile')}
          style={{
            display: 'flex', alignItems: 'center', gap: 3,
            border: 'none', background: 'none', cursor: 'pointer',
            color: '#ACACB8', fontSize: 13, fontWeight: 600, fontFamily: 'inherit',
            padding: '4px 0',
          }}
        >
          <IChevLeft size={16} />
          Profile
        </button>
        <span style={{ color: '#D1D1DB', fontSize: 13 }}>/</span>
        <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3, color: '#0F0F12' }}>
          Categories
        </span>
      </div>
    ) : tab === 'home' ? (
      <div>
        <div style={{ fontSize: 12, color: '#ACACB8', fontWeight: 500 }}>{greetingLine()}</div>
        <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3, marginTop: 2 }}>
          {firstName(profile, user)}
        </div>
      </div>
    ) : tab === 'stats' ? (
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.6 }}>Stats</div>
    ) : tab === 'history' ? (
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.6 }}>History</div>
    ) : tab === 'profile' ? (
      <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.6 }}>Profile</div>
    ) : null;

  return (
    <div className="app-shell">
      <div className={`page-scroll${adding ? ' page-scroll--no-nav' : ''}`}>
        {!adding && (
          <AppTopBar onProfile={() => navigateToTab('profile')} profile={profile} user={user}>
            {topBarContent}
          </AppTopBar>
        )}
        <DataErrorBanner message={combinedError} onRetry={handleRetryData} busy={retrying} />
        <div className="app-main">
          <AnimatePresence mode="wait">
            <motion.div
              key={adding ? `add-${editingTxn?.id ?? 'new'}` : tab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.36, ease: SMOOTH_DECEL }}
              style={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                overflowY: 'auto',
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {mainContent}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {!adding && (
        <nav className="bottom-nav" aria-label="Main">
          {TABS.map((t) => {
            if (!t) {
              return (
                <div key="fab" className="nav-fab-wrap">
                  <motion.button
                    type="button"
                    className="nav-fab"
                    onClick={openAdd}
                    aria-label={canOpenAdd ? 'Add transaction' : 'Add unavailable'}
                    disabled={!canOpenAdd}
                    whileTap={canOpenAdd ? { scale: 0.92 } : undefined}
                    whileHover={canOpenAdd ? { scale: 1.04 } : undefined}
                    transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                    style={{ opacity: canOpenAdd ? 1 : 0.45 }}
                  >
                    <IPlus size={26} stroke={2.4} />
                  </motion.button>
                </div>
              );
            }
            const active = effectiveActiveTab === t.id;
            const Icon = t.Icon;
            return (
              <button
                key={t.id}
                type="button"
                className={`nav-btn${active ? ' active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => navigateToTab(t.id)}
              >
                <Icon size={22} stroke={active ? 2.3 : 1.8} />
                {t.label}
              </button>
            );
          })}
        </nav>
      )}

      <AnimatePresence>
        {toast ? <Toast key={toast.id} toast={toast} accent={ACCENT} currency={currency} /> : null}
      </AnimatePresence>
    </div>
  );
}
