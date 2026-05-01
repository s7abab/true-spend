import { useState, useMemo, useCallback } from 'react';
import { HomeScreen }    from './screens/HomeScreen';
import { StatsScreen }   from './screens/StatsScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { AddSheet }      from './screens/AddSheet';
import { CategoriesScreen } from './screens/CategoriesScreen';
import { AppTopBar }     from './components/AppTopBar';
import { Toast }         from './components/Toast';
import {
  SEED_TXNS,
  findCatWith,
  mergeExpenseDisplay,
  mergeIncomeDisplay,
} from './data/categories';
import { useCustomCategories } from './hooks/useCustomCategories';
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

function topBarTitle(tab) {
  switch (tab) {
    case 'home':
      return (
        <div>
          <div style={{ fontSize: 12, color: '#ACACB8', fontWeight: 500 }}>Good morning</div>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: -0.3, marginTop: 2 }}>Aarav</div>
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

export default function App() {
  const { custom, overrides, addCategory, removeCategory, updateCategory } = useCustomCategories();
  const [tab, setTab]         = useState('home');
  const [adding, setAdding]   = useState(false);
  const [txns, setTxns]     = useState(SEED_TXNS);
  const [toast, setToast]   = useState(null);

  const catsExpense = useMemo(
    () => mergeExpenseDisplay(custom.expense, overrides.expense),
    [custom.expense, overrides.expense],
  );
  const catsIncome = useMemo(
    () => mergeIncomeDisplay(custom.income, overrides.income),
    [custom.income, overrides.income],
  );

  const lists = useMemo(() => ({ expense: catsExpense, income: catsIncome }), [catsExpense, catsIncome]);

  const resolveCat = useCallback(
    (id, kind) =>
      findCatWith(id, kind, custom.expense, custom.income, overrides.expense, overrides.income),
    [custom.expense, custom.income, overrides.expense, overrides.income],
  );

  const addTxn = (t) => {
    setTxns(prev => [{ ...t, id: 'n' + Date.now() }, ...prev]);
    setAdding(false);
    setToast({ kind: t.kind, amount: t.amount });
    setTimeout(() => setToast(null), 2000);
  };

  const screen = {
    home:       <HomeScreen    txns={txns} accent={ACCENT} onAdd={() => setAdding(true)} resolveCat={resolveCat} />,
    stats:      <StatsScreen   txns={txns} accent={ACCENT} categoriesExpense={catsExpense} />,
    history:    <HistoryScreen txns={txns} accent={ACCENT} onAdd={() => setAdding(true)} resolveCat={resolveCat} />,
    categories: (
      <CategoriesScreen
        accent={ACCENT}
        lists={lists}
        onAdd={addCategory}
        onRemove={removeCategory}
        onUpdate={updateCategory}
      />
    ),
    profile:    <ProfileScreen />,
  }[tab];

  return (
    <div className="app-shell">
      <div className="page-scroll">
        {!adding && (
          <AppTopBar onProfile={() => setTab('profile')}>
            {topBarTitle(tab)}
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
          onClose={() => setAdding(false)}
          onSave={addTxn}
        />
      )}

      {toast && <Toast toast={toast} accent={ACCENT} />}
    </div>
  );
}
