import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import {
  Navigate,
  Outlet,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import type { DbTransactionRow, MappedTxn } from '@/utils/txnMap';
import { mapTxnRow } from '@/utils/txnMap';
import { fetchTransactionById } from '@/features/transactions/api/transactions';
import { queryKeys } from '@/shared/lib/queryKeys';
import { AppBootLoading } from '@/shared/components/loading';
import { AppTopBar } from '@/shared/components/AppTopBar';
import { DataErrorBanner } from '@/shared/components/DataErrorBanner';
import { AddTransactionScreen } from '@/features/transactions/components/AddTransactionScreen';
import { TXN_ASSISTANT_DISPLAY_NAME } from '@/features/transactions/lib/txnAssistantDisplayName';
import { IHome, IChart, IList, IPlus, IChevLeft, ISparkle } from '@/shared/components/Icons';
import type { ProfileRow } from '@/features/profile/types';
import type { User } from '@supabase/supabase-js';
import type { ToastPayload } from '@/shared/components/Toast';
import type { HomeMetrics } from '@/features/transactions/types';
import { useAuth } from '@/features/auth/components/AuthContext';
import { ProfileStackLayout } from '@/features/shell/components/ProfileStackLayout';
import { useSwipeBack } from '@/shared/hooks/useSwipeBack';
import type { TabId } from '@/features/shell/types/navigation';
import { pathnameForTab, tabFromPathname } from '@/features/shell/lib/tabRoutes';

const HomeScreen = lazy(() =>
  import('@/features/transactions/components/HomeScreen').then((m) => ({ default: m.HomeScreen })),
);
const StatsScreen = lazy(() =>
  import('@/features/stats/components/StatsScreen').then((m) => ({ default: m.StatsScreen })),
);
const HistoryScreen = lazy(() =>
  import('@/features/history/components/HistoryScreen').then((m) => ({ default: m.HistoryScreen })),
);
const ProfileScreen = lazy(() =>
  import('@/features/profile/components/ProfileScreen').then((m) => ({ default: m.ProfileScreen })),
);
const CategoriesScreen = lazy(() =>
  import('@/features/categories/components/CategoriesScreen').then((m) => ({ default: m.CategoriesScreen })),
);
const TxnChatScreen = lazy(() =>
  import('@/features/transactions/components/TxnChatScreen').then((m) => ({ default: m.TxnChatScreen })),
);

const ACCENT = '#0F0F12';

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

const ease = [0.22, 1, 0.36, 1] as const;

type TabDef = { id: TabId; label: string; to: string; Icon: ComponentType<{ size?: number; stroke?: number }> };

const TABS: (TabDef | null)[] = [
  { id: 'home', label: 'Home', to: '/', Icon: IHome },
  { id: 'chat', label: TXN_ASSISTANT_DISPLAY_NAME, to: '/chat', Icon: ISparkle },
  null,
  { id: 'history', label: 'History', to: '/history', Icon: IList },
  { id: 'stats', label: 'Stats', to: '/stats', Icon: IChart },
];

type CatApi = ReturnType<typeof import('@/features/categories/hooks/useCategories').useCategories>;
type TxnApi = ReturnType<typeof import('@/features/transactions/hooks/useTransactions').useTransactions>;
type ProfApi = ReturnType<typeof import('@/features/profile/hooks/useProfile').useProfile>;

export type ShellRoutesProps = {
  user: User | null;
  profile: ProfApi['profile'];
  updateProfile: ProfApi['updateProfile'];
  lists: CatApi['lists'];
  catsExpense: CatApi['catsExpense'];
  catsIncome: CatApi['catsIncome'];
  catsTransfer: CatApi['catsTransfer'];
  resolveCat: CatApi['resolveCat'];
  addCategory: CatApi['addCategory'];
  removeCategory: CatApi['removeCategory'];
  updateCategory: CatApi['updateCategory'];
  reorderCategory: CatApi['reorderCategory'];
  categoriesReordering: CatApi['reordering'];
  categoriesLoading: CatApi['loading'];
  categoriesError: CatApi['error'];
  home: HomeMetrics;
  addTransaction: TxnApi['addTransaction'];
  addTransactions: TxnApi['addTransactions'];
  updateTransaction: TxnApi['updateTransaction'];
  removeTransaction: TxnApi['removeTransaction'];
  exportAllTransactions: TxnApi['exportAllTransactions'];
  currency: string;
  combinedError: string | null;
  retrying: boolean;
  onRetryData: () => Promise<void>;
  canOpenAdd: boolean;
  setToast: (t: ToastPayload | null) => void;
};

function RouteFallback() {
  return <AppBootLoading />;
}

function BottomNav(props: Pick<ShellRoutesProps, 'canOpenAdd' | 'categoriesLoading' | 'categoriesError' | 'setToast'>) {
  const location = useLocation();
  const navigate = useNavigate();
  const [inputFocused, setInputFocused] = useState(false);
  const touchPathRef = useRef<string | null>(null);
  const touchDraggingRef = useRef(false);
  const [touchPreviewPath, setTouchPreviewPath] = useState<string | null>(null);
  const activeTab = location.pathname.startsWith('/add') || location.pathname.startsWith('/edit/')
    ? null
    : tabFromPathname(location.pathname);
  const addActive = location.pathname.startsWith('/add');

  useEffect(() => {
    const isInputTarget = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      return Boolean(target.closest('input, textarea, select, [contenteditable="true"]'));
    };
    const onFocusIn = (e: FocusEvent) => setInputFocused(isInputTarget(e.target));
    const onFocusOut = () => {
      window.setTimeout(() => setInputFocused(isInputTarget(document.activeElement)), 0);
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('bottom-nav-input-focused', inputFocused);
    return () => {
      document.documentElement.classList.remove('bottom-nav-input-focused');
    };
  }, [inputFocused]);

  const showAddUnavailable = useCallback(() => {
    const msg = props.categoriesLoading
      ? 'Still loading categories…'
      : props.categoriesError
        ? 'Fix the data connection, then try again.'
        : 'Add a category first (avatar → Profile → Categories).';
    props.setToast({ id: Date.now(), kind: 'error', message: msg });
    setTimeout(() => props.setToast(null), 3200);
  }, [props]);

  const commitNavPath = useCallback(
    (path: string | null) => {
      if (!path) return;
      if (path === '/add') {
        if (addActive) return;
        if (!props.canOpenAdd) {
          showAddUnavailable();
          return;
        }
      }
      if (location.pathname !== path) void navigate(path);
    },
    [addActive, location.pathname, navigate, props.canOpenAdd, showAddUnavailable],
  );

  const previewNavPath = (path: string | null) => {
    if (touchPathRef.current === path) return;
    touchPathRef.current = path;
    setTouchPreviewPath(path);
  };

  const endTouchNav = (commit: boolean) => {
    const path = touchPathRef.current;
    touchDraggingRef.current = false;
    touchPathRef.current = null;
    setTouchPreviewPath(null);
    if (commit) commitNavPath(path);
  };

  const navPathAtPoint = (clientX: number, clientY: number) => {
    const el = document.elementFromPoint(clientX, clientY) as HTMLElement | null;
    return (el?.closest('[data-nav-to]') as HTMLElement | null)?.dataset.navTo ?? null;
  };

  return (
    <nav
      className={`bottom-nav${inputFocused ? ' bottom-nav--input-focused' : ''}`}
      aria-label="Main"
      onPointerDown={(e) => {
        if (e.pointerType !== 'touch') return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        touchDraggingRef.current = true;
        previewNavPath(navPathAtPoint(e.clientX, e.clientY));
      }}
      onPointerMove={(e) => {
        if (e.pointerType !== 'touch') return;
        if (!touchDraggingRef.current) return;
        previewNavPath(navPathAtPoint(e.clientX, e.clientY));
      }}
      onPointerUp={(e) => {
        if (e.pointerType !== 'touch') return;
        endTouchNav(true);
      }}
      onPointerCancel={(e) => {
        if (e.pointerType !== 'touch') return;
        endTouchNav(false);
      }}
    >
      {TABS.map((t) => {
        if (!t) {
          const fabActive = touchPreviewPath === '/add' || (!touchPreviewPath && addActive);
          return (
            <div key="fab" className="nav-fab-wrap" data-nav-to="/add">
              <button
                type="button"
                className={`nav-fab${fabActive ? ' active' : ''}`}
                onClick={() => {
                  if (addActive) return;
                  if (!props.canOpenAdd) {
                    showAddUnavailable();
                    return;
                  }
                  navigate('/add');
                }}
                aria-label={props.canOpenAdd ? 'Add transaction' : 'Add unavailable'}
                aria-current={addActive ? 'page' : undefined}
                disabled={!props.canOpenAdd}
                style={{ opacity: props.canOpenAdd ? 1 : 0.45 }}
              >
                <IPlus size={26} stroke={2.4} />
              </button>
            </div>
          );
        }
        const Icon = t.Icon;
        const tabActive = touchPreviewPath === t.to || (!touchPreviewPath && activeTab === t.id);
        const currentTab = activeTab === t.id;
        const goTab = () => {
          if (touchDraggingRef.current) return;
          if (location.pathname === t.to) return;
          void navigate(t.to);
        };
        return (
          <button
            key={t.id}
            type="button"
            data-nav-to={t.to}
            data-tab={t.id}
            className={`nav-btn${tabActive ? ' active' : ''}`}
            aria-current={currentTab ? 'page' : undefined}
            onClick={goTab}
          >
            <Icon
              size={t.id === 'chat' ? 30 : 22}
              stroke={tabActive ? 2.35 : t.id === 'chat' ? 2.05 : 1.8}
            />
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}

function ShellDocumentTitle() {
  const { pathname } = useLocation();
  useEffect(() => {
    let section = 'Truspend';
    if (pathname === '/' || pathname === '/home') section = 'Home';
    else if (pathname.startsWith('/stats')) section = 'Stats';
    else if (pathname.startsWith('/history')) section = 'History';
    else if (pathname.startsWith('/profile/categories')) section = 'Categories';
    else if (pathname.startsWith('/profile')) section = 'Profile';
    else if (pathname.startsWith('/add')) section = 'Add transaction';
    else if (pathname.startsWith('/chat')) section = TXN_ASSISTANT_DISPLAY_NAME;
    else if (pathname.startsWith('/edit/')) section = 'Edit transaction';
    document.title = `${section} · Truspend`;
  }, [pathname]);
  return null;
}

function AiChatRoute(props: ShellRoutesProps) {
  const navigate = useNavigate();
  useSwipeBack({ enabled: true, onBack: () => navigate(-1) });

  return (
    <div className="app-shell">
      <div className="page-scroll">
        <div className="app-main">
          <div
            style={{
              flex: 1,
              alignSelf: 'stretch',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              minWidth: 0,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <motion.div
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.26, ease }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
            >
              <Suspense fallback={<RouteFallback />}>
                <TxnChatScreen
                  layout="page"
                  onTransactionsSaved={() => {}}
                  catsExpense={props.catsExpense}
                  catsIncome={props.catsIncome}
                  catsTransfer={props.catsTransfer}
                  addTransaction={props.addTransaction}
                  addTransactions={props.addTransactions}
                  currency={props.currency}
                  combinedError={props.combinedError}
                  retrying={props.retrying}
                  onRetryData={props.onRetryData}
                  setToast={props.setToast}
                  canOpenAdd={props.canOpenAdd}
                  categoriesLoading={props.categoriesLoading}
                  categoriesError={props.categoriesError}
                />
              </Suspense>
            </motion.div>
          </div>
        </div>
      </div>
      <BottomNav {...props} />
    </div>
  );
}

function TabShellLayout(props: ShellRoutesProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = tabFromPathname(location.pathname);
  const isCategories = location.pathname.endsWith('/categories');

  const topBarContent: ReactNode = isCategories ? (
    <div className="stack-header-breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button type="button" className="stack-header-back" onClick={() => navigate('/profile')}>
        <IChevLeft size={16} />
        Profile
      </button>
      <span style={{ color: '#D1D1DB', fontSize: 13 }}>/</span>
      <span style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3, color: '#0F0F12' }}>Categories</span>
    </div>
  ) : activeTab === 'home' ? (
    <div>
      <div style={{ fontSize: 12, color: '#ACACB8', fontWeight: 500 }}>{greetingLine()}</div>
      <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3, marginTop: 2 }}>
        {firstName(props.profile, props.user)}
      </div>
    </div>
  ) : activeTab === 'stats' ? (
    <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.6 }}>Stats</div>
  ) : activeTab === 'history' ? (
    <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.6 }}>History</div>
  ) : activeTab === 'profile' ? (
    <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.6 }}>Profile</div>
  ) : null;

  return (
    <div className="app-shell">
      <div className="page-scroll">
        <AppTopBar onProfile={() => navigate('/profile')} profile={props.profile} user={props.user}>
          {topBarContent}
        </AppTopBar>
        <DataErrorBanner message={props.combinedError} onRetry={props.onRetryData} busy={props.retrying} />
        <div className="app-main">
          <div className="tab-outlet-scroll">
            <Suspense fallback={<RouteFallback />}>
              <Outlet />
            </Suspense>
          </div>
        </div>
      </div>

      <BottomNav {...props} />
    </div>
  );
}

function AddTransactionRoute(props: ShellRoutesProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const stateTxn = (location.state as { txn?: MappedTxn } | null)?.txn ?? null;

  const [savingTxn, setSavingTxn] = useState(false);

  const closeTxnSheet = () => {
    if (!savingTxn) navigate(-1);
  };

  useSwipeBack({ enabled: true, onBack: closeTxnSheet });

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
      const res = await props.addTransaction({
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
        props.setToast({ id: Date.now(), kind: 'error', message: msg });
        setTimeout(() => props.setToast(null), 4200);
        return false;
      }
      props.setToast({
        id: Date.now(),
        kind: t.kind === 'income' ? 'income' : t.kind === 'transfer' ? 'transfer' : 'expense',
        amount: t.amount,
      });
      setTimeout(() => props.setToast(null), 2400);
      return true;
    } finally {
      setSavingTxn(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="page-scroll">
        <DataErrorBanner message={props.combinedError} onRetry={props.onRetryData} busy={props.retrying} />
        <div className="app-main">
          <div
            style={{
              flex: 1,
              alignSelf: 'stretch',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              minWidth: 0,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <motion.div
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.26, ease }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
            >
              <AddTransactionScreen
                accent={ACCENT}
                categoriesExpense={props.catsExpense}
                categoriesIncome={props.catsIncome}
                categoriesTransfer={props.catsTransfer}
                currency={props.currency}
                saving={savingTxn}
                deleting={false}
                initialTxn={stateTxn}
                onDelete={undefined}
                onClose={closeTxnSheet}
                onSave={onSaveTxn}
                asPage
                aiChat={null}
              />
            </motion.div>
          </div>
        </div>
      </div>
      <BottomNav {...props} />
    </div>
  );
}

function EditTransactionRoute(props: ShellRoutesProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { txnId } = useParams<{ txnId: string }>();
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const stateTxn = (location.state as { txn?: MappedTxn } | null)?.txn ?? null;

  const [savingTxn, setSavingTxn] = useState(false);
  const [deletingTxn, setDeletingTxn] = useState(false);

  const detailQuery = useQuery({
    queryKey: userId && txnId ? queryKeys.transactions.detail(userId, txnId) : ['transactions', 'detail', 'idle'],
    queryFn: async ({ signal }) => {
      const { data, error } = await fetchTransactionById(userId!, txnId!, { signal });
      if (error) throw error;
      return data;
    },
    enabled: Boolean(userId && txnId && !stateTxn),
    staleTime: 60_000,
  });

  const editingTxn: MappedTxn | null = useMemo(() => {
    if (stateTxn && stateTxn.id === txnId) return stateTxn;
    const row = detailQuery.data;
    if (!row || typeof row !== 'object') return null;
    return mapTxnRow(row as DbTransactionRow);
  }, [stateTxn, txnId, detailQuery.data]);

  const closeTxnSheet = () => {
    if (!savingTxn && !deletingTxn) navigate(-1);
  };

  useSwipeBack({ enabled: true, onBack: closeTxnSheet });

  const onSaveTxn = async (t: {
    kind: string;
    category_id: string | null;
    amount: number;
    title: string;
    note: string | null;
    occurred_at: string;
  }) => {
    if (!editingTxn) return;
    setSavingTxn(true);
    try {
      const res = await props.updateTransaction(editingTxn.id, {
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
        props.setToast({ id: Date.now(), kind: 'error', message: msg });
        setTimeout(() => props.setToast(null), 4200);
        return;
      }
      navigate(-1);
      props.setToast({ id: Date.now(), kind: 'done', message: 'Transaction updated' });
      setTimeout(() => props.setToast(null), 2600);
    } finally {
      setSavingTxn(false);
    }
  };

  const onDeleteTxn = async () => {
    if (!editingTxn) return;
    setDeletingTxn(true);
    try {
      const res = await props.removeTransaction(editingTxn.id);
      if (res.error) {
        const msg = res.error.message || 'Could not delete transaction';
        console.error('removeTransaction failed', res.error);
        props.setToast({ id: Date.now(), kind: 'error', message: msg });
        setTimeout(() => props.setToast(null), 4200);
        return;
      }
      navigate(-1);
      props.setToast({ id: Date.now(), kind: 'done', message: 'Transaction deleted' });
      setTimeout(() => props.setToast(null), 2600);
    } finally {
      setDeletingTxn(false);
    }
  };

  if (!txnId) return <Navigate to="/" replace />;

  if (!stateTxn && (detailQuery.isPending || detailQuery.isFetching)) {
    return (
      <div className="app-shell">
        <AppBootLoading />
      </div>
    );
  }

  if (!stateTxn && detailQuery.isError) {
    return <Navigate to="/" replace />;
  }

  if (!editingTxn) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="app-shell">
      <div className="page-scroll">
        <DataErrorBanner message={props.combinedError} onRetry={props.onRetryData} busy={props.retrying} />
        <div className="app-main">
          <div
            style={{
              flex: 1,
              alignSelf: 'stretch',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              minWidth: 0,
              overflowY: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <motion.div
              key={txnId}
              initial={{ opacity: 0, x: 28 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.26, ease }}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}
            >
              <AddTransactionScreen
                accent={ACCENT}
                categoriesExpense={props.catsExpense}
                categoriesIncome={props.catsIncome}
                categoriesTransfer={props.catsTransfer}
                currency={props.currency}
                saving={savingTxn}
                deleting={deletingTxn}
                initialTxn={editingTxn}
                onDelete={() => void onDeleteTxn()}
                onClose={closeTxnSheet}
                onSave={onSaveTxn}
                asPage
              />
            </motion.div>
          </div>
        </div>
      </div>
      <BottomNav {...props} />
    </div>
  );
}

export function ShellRoutes(props: ShellRoutesProps) {
  const navigate = useNavigate();
  const { canOpenAdd, categoriesLoading, categoriesError, setToast } = props;

  const openEditTxn = useCallback(
    (txn: MappedTxn) => {
      if (!canOpenAdd) {
        const msg = categoriesLoading
          ? 'Still loading categories…'
          : categoriesError
            ? 'Fix the data connection, then try again.'
            : 'Add at least one category first (avatar → Profile → Categories).';
        setToast({ id: Date.now(), kind: 'error', message: msg });
        setTimeout(() => setToast(null), 3200);
        return;
      }
      navigate(`/edit/${txn.id}`, { state: { txn } });
    },
    [canOpenAdd, categoriesLoading, categoriesError, setToast, navigate],
  );

  return (
    <>
      <ShellDocumentTitle />
      <Routes>
      <Route path="/home" element={<Navigate to="/" replace />} />
      <Route path="/categories" element={<Navigate to="/profile/categories" replace />} />

      <Route path="/add" element={<AddTransactionRoute {...props} />} />
      <Route path="/chat" element={<AiChatRoute {...props} />} />
      <Route path="/edit/:txnId" element={<EditTransactionRoute {...props} />} />

      <Route path="/" element={<TabShellLayout {...props} />}>
        <Route
          index
          element={
            <HomeScreen
              income={props.home.lifetimeIncome}
              expense={props.home.lifetimeExpense}
              weekBuckets={props.home.weekBuckets}
              prevWeekExpense={props.home.prevWeekExpense}
              recentTxns={props.home.recentTxns}
              accent={ACCENT}
              resolveCat={props.resolveCat}
              currency={props.currency}
              onSeeAll={() => navigate(pathnameForTab('history'))}
              onTxnPress={openEditTxn}
            />
          }
        />
        <Route
          path="stats"
          element={
            <StatsScreen
              categoriesExpense={props.catsExpense}
              categoriesIncome={props.catsIncome}
              categoriesTransfer={props.catsTransfer}
              resolveCat={props.resolveCat}
              currency={props.currency}
              onTxnPress={openEditTxn}
            />
          }
        />
        <Route
          path="history"
          element={
            <HistoryScreen
              resolveCat={props.resolveCat}
              categoriesExpense={props.catsExpense}
              categoriesIncome={props.catsIncome}
              categoriesTransfer={props.catsTransfer}
              currency={props.currency}
              onTxnPress={openEditTxn}
            />
          }
        />
        <Route path="profile" element={<ProfileStackLayout />}>
          <Route
            index
            element={
              <ProfileScreen
                profile={props.profile}
                user={props.user}
                updateProfile={props.updateProfile}
                lists={props.lists}
                onExportTransactions={props.exportAllTransactions}
                onGoToCategories={() => navigate('/profile/categories')}
              />
            }
          />
          <Route
            path="categories"
            element={
              <CategoriesScreen
                accent={ACCENT}
                lists={props.lists}
                onAdd={props.addCategory}
                onRemove={props.removeCategory}
                onUpdate={props.updateCategory}
                onReorder={props.reorderCategory}
                reordering={props.categoriesReordering}
              />
            }
          />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </>
  );
}
