import { useState } from 'react';
import { HomeScreen }    from './screens/HomeScreen';
import { StatsScreen }   from './screens/StatsScreen';
import { HistoryScreen } from './screens/HistoryScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { AddSheet }      from './screens/AddSheet';
import { Toast }         from './components/Toast';
import { SEED_TXNS }     from './data/categories';
import { IHome, IChart, IList, IUser, IPlus } from './components/Icons';
import './App.css';

const ACCENT = '#0F0F12';

const TABS = [
  { id: 'home',    label: 'Home',    Icon: IHome },
  { id: 'stats',   label: 'Report',  Icon: IChart },
  null, // FAB slot
  { id: 'history', label: 'History', Icon: IList },
  { id: 'profile', label: 'Profile', Icon: IUser },
];

export default function App() {
  const [tab, setTab]       = useState('home');
  const [adding, setAdding] = useState(false);
  const [txns, setTxns]     = useState(SEED_TXNS);
  const [toast, setToast]   = useState(null);

  const addTxn = (t) => {
    setTxns(prev => [{ ...t, id: 'n' + Date.now() }, ...prev]);
    setAdding(false);
    setToast({ kind: t.kind, amount: t.amount });
    setTimeout(() => setToast(null), 2000);
  };

  const screen = {
    home:    <HomeScreen    txns={txns} accent={ACCENT} onAdd={() => setAdding(true)} />,
    stats:   <StatsScreen   txns={txns} accent={ACCENT} />,
    history: <HistoryScreen txns={txns} accent={ACCENT} onAdd={() => setAdding(true)} />,
    profile: <ProfileScreen />,
  }[tab];

  return (
    <div className="app-shell">
      {/* page */}
      <div className="page-scroll">{screen}</div>

      {/* bottom nav */}
      <nav className="bottom-nav">
        {TABS.map((t, i) => {
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

      {/* add sheet */}
      {adding && <AddSheet accent={ACCENT} onClose={() => setAdding(false)} onSave={addTxn} />}

      {/* toast */}
      {toast && <Toast toast={toast} accent={ACCENT} />}
    </div>
  );
}
