import { useState } from 'react';
import { HomeScreen }    from './screens/HomeScreen';
import { StatsScreen }   from './screens/StatsScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { AddSheet }      from './screens/AddSheet';
import { CategoriesScreen } from './screens/CategoriesScreen';
import { SignInScreen }  from './screens/SignInScreen';
import { AppTopBar }     from './components/AppTopBar';
import { Toast }         from './components/Toast';
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
      <div style={{ color: '#ACACB8', fontSize: 13, fontWeight: 500 }}>Loading…</div>
    </div>
  );
}

export default function App() {
  const { session, user, loading: authLoading } = useAuth();

  if (authLoading) return <Splash />;
  if (!session)    return <div className="app-shell"><SignInScreen /></div>;

  return <AuthedApp user={user} />;
}

function AuthedApp({ user }) {
  const { profile, updateProfile } = useProfile();
  const {
    catsExpense, catsIncome, lists,
    resolveCat, addCategory, removeCategory, updateCategory,
  } = useCategories();
  const { txns, addTransaction } = useTransactions();
  const currency = profile?.currency || 'INR';

  const [tab, setTab]       = useState('home');
  const [adding, setAdding] = useState(false);
  const [toast, setToast]   = useState(null);

  const onSaveTxn = async (t) => {
    const res = await addTransaction({
      kind:        t.kind,
      category_id: t.category_id,
      amount:      t.amount,
      title:       t.title,
      note:        t.note,
      occurred_at: t.occurred_at,
    });
    if (res.error) {
      console.error('addTransaction failed', res.error);
      return;
    }
    setAdding(false);
    setToast({ kind: t.kind, amount: t.amount });
    setTimeout(() => setToast(null), 2000);
  };

  const screen = {
    home:       <HomeScreen    txns={txns} accent={ACCENT} resolveCat={resolveCat} currency={currency} onSeeAll={() => setTab('history')} />,
    stats:      <StatsScreen   txns={txns} accent={ACCENT} categoriesExpense={catsExpense} currency={currency} />,
    history:    <HistoryScreen txns={txns} accent={ACCENT} resolveCat={resolveCat} currency={currency} />,
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
        txns={txns}
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
        <div className="app-main">{screen}</div>
      </div>

      {/* bottom nav — profile is opened from top bar only */}
      {!adding && (
        <nav className="bottom-nav">
          {TABS.map((t) => {
            if (!t) {
              return (
                <div key="fab" className="nav-fab-wrap">
                  <button className="nav-fab" onClick={() => setAdding(true)}>
                    <IPlus size={26} stroke={2.4} />
                  </button>
                </div>
              );
            }
            const active = tab === t.id;
            return (
              <button key={t.id} className={`nav-btn${active ? ' active' : ''}`} onClick={() => setTab(t.id)}>
                <t.Icon size={22} stroke={active ? 2.3 : 1.8} />
                {t.label}
              </button>
            );
          })}
        </nav>
      )}

      {adding && (
        <AddSheet
          accent={ACCENT}
          categoriesExpense={catsExpense}
          categoriesIncome={catsIncome}
          currency={currency}
          onClose={() => setAdding(false)}
          onSave={onSaveTxn}
        />
      )}

      {toast && <Toast toast={toast} accent={ACCENT} currency={currency} />}
    </div>
  );
}
