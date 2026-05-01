import { useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { HomeScreen }    from './screens/HomeScreen';
import { StatsScreen }   from './screens/StatsScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { AddSheet }      from './screens/AddSheet';
import { CategoriesScreen } from './screens/CategoriesScreen';
import { SignInScreen }  from './screens/SignInScreen';
import { AppTopBar }     from './components/AppTopBar';
import { Toast }         from './components/Toast';
import { DataErrorBanner } from './components/DataErrorBanner';
import { useAuth }       from './context/AuthContext';
import { useProfile }    from './hooks/useProfile';
import { useCategories } from './hooks/useCategories';
import { useTransactions } from './hooks/useTransactions';
import { IHome, IChart, IList, ITag, IPlus } from './components/Icons';
import './App.css';

const ACCENT = '#0F0F12';

const TABS = [
  { id: 'home',       label: 'Home',       Icon: IHome },
  { id: 'stats',      label: 'Report',     Icon: IChart },
  null, // FAB slot
  { id: 'history',    label: 'History',    Icon: IList },
  { id: 'categories', label: 'Categories', Icon: ITag },
];

function firstName(profile, user) {
  const full = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || '';
  if (full) return full.split(/\s+/)[0];
  if (user?.email) return user.email.split('@')[0];
  return 'there';
}

function greetingLine() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function topBarTitle(tab, profile, user) {
  switch (tab) {
    case 'home':
      return (
        <div>
          <div style={{ fontSize: 12, color: '#ACACB8', fontWeight: 500 }}>{greetingLine()}</div>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3, marginTop: 2 }}>
            {firstName(profile, user)}
          </div>
        </div>
      );
    case 'stats':
      return <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.6 }}>Report</div>;
    case 'history':
      return <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.6 }}>History</div>;
    case 'categories':
      return <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.6 }}>Categories</div>;
    case 'profile':
      return <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.6 }}>Profile</div>;
    default:
      return null;
  }
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

function AuthedApp({ user }) {
  const { profile, updateProfile, error: profileError, refetch: refetchProfile } = useProfile();
  const {
    catsExpense, catsIncome, lists,
    resolveCat, addCategory, removeCategory, updateCategory,
    loading: categoriesLoading, error: categoriesError, refetch: refetchCategories,
  } = useCategories();
  const {
    home,
    addTransaction,
    exportAllTransactions,
    mutationGeneration,
    error: txnsError,
    refetch: refetchTransactions,
  } = useTransactions();
  const currency = profile?.currency || 'INR';

  const [tab, setTab]         = useState('home');
  const [adding, setAdding]   = useState(false);
  const [toast, setToast]     = useState(null);
  const [savingTxn, setSavingTxn] = useState(false);
  const [retrying, setRetrying] = useState(false);

  const dataErrors = [profileError, categoriesError, txnsError].filter(Boolean);
  const combinedError = dataErrors.length
    ? dataErrors[0] + (dataErrors.length > 1 ? ` (+${dataErrors.length - 1} more)` : '')
    : null;

  const handleRetryData = useCallback(async () => {
    setRetrying(true);
    try {
      await Promise.all([refetchProfile(), refetchCategories(), refetchTransactions()]);
    } finally {
      setRetrying(false);
    }
  }, [refetchProfile, refetchCategories, refetchTransactions]);

  // Need at least one category on either side; AddSheet disables empty expense/income tabs.
  const canOpenAdd =
    !categoriesLoading
    && !categoriesError
    && (catsExpense.length > 0 || catsIncome.length > 0);

  const onSaveTxn = async (t) => {
    setSavingTxn(true);
    try {
      const res = await addTransaction({
        kind:        t.kind,
        category_id: t.category_id,
        amount:      t.amount,
        title:       t.title,
        note:        t.note,
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
      setToast({ id: Date.now(), kind: t.kind, amount: t.amount });
      setTimeout(() => setToast(null), 2400);
    } finally {
      setSavingTxn(false);
    }
  };

  const openAdd = () => {
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
    setAdding(true);
  };

  const screen = {
    home:       (
      <HomeScreen
        income={home.lifetimeIncome}
        expense={home.lifetimeExpense}
        weekBuckets={home.weekBuckets}
        prevWeekExpense={home.prevWeekExpense}
        recentTxns={home.recentTxns}
        accent={ACCENT}
        resolveCat={resolveCat}
        currency={currency}
        onSeeAll={() => setTab('history')}
      />
    ),
    stats:      <StatsScreen categoriesExpense={catsExpense} currency={currency} refreshKey={mutationGeneration} />,
    history:    <HistoryScreen resolveCat={resolveCat} currency={currency} refreshKey={mutationGeneration} />,
    categories: (
      <CategoriesScreen
        accent={ACCENT}
        lists={lists}
        onAdd={addCategory}
        onRemove={removeCategory}
        onUpdate={updateCategory}
      />
    ),
    profile:    (
      <ProfileScreen
        profile={profile}
        user={user}
        updateProfile={updateProfile}
        lists={lists}
        onExportTransactions={exportAllTransactions}
      />
    ),
  }[tab];

  return (
    <div className="app-shell">
      <div className="page-scroll">
        {!adding && (
          <AppTopBar onProfile={() => setTab('profile')} profile={profile} user={user}>
            {topBarTitle(tab, profile, user)}
          </AppTopBar>
        )}
        <DataErrorBanner
          message={combinedError}
          onRetry={handleRetryData}
          busy={retrying}
        />
        <div className="app-main">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
            >
              {screen}
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
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`nav-btn${active ? ' active' : ''}`}
                aria-current={active ? 'page' : undefined}
                onClick={() => setTab(t.id)}
              >
                <t.Icon size={22} stroke={active ? 2.3 : 1.8} />
                {t.label}
              </button>
            );
          })}
        </nav>
      )}

      <AnimatePresence>
        {adding && (
          <AddSheet
            key="add-sheet"
            accent={ACCENT}
            categoriesExpense={catsExpense}
            categoriesIncome={catsIncome}
            currency={currency}
            saving={savingTxn}
            onClose={() => !savingTxn && setAdding(false)}
            onSave={onSaveTxn}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <Toast key={toast.id} toast={toast} accent={ACCENT} currency={currency} />
        )}
      </AnimatePresence>
    </div>
  );
}
