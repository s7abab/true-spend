import { IHome, IChart, IList, IUser, IPlus } from './Icons';

const items = [
  { id: 'home',    Icon: IHome,  label: 'Home' },
  { id: 'stats',   Icon: IChart, label: 'Report' },
  { id: 'add',     Icon: IPlus,  label: 'Add', isFab: true },
  { id: 'history', Icon: IList,  label: 'History' },
  { id: 'profile', Icon: IUser,  label: 'Profile' },
];

export function BottomNav({ tab, onTab, onAdd, accent, fabStyle = 'raised' }) {
  const raised = fabStyle === 'raised';
  return (
    <div style={{
      position: 'absolute', left: 0, right: 0, bottom: 0,
      paddingBottom: 24, paddingTop: 6,
      background: 'linear-gradient(to top, #fff 60%, rgba(255,255,255,0))',
      pointerEvents: 'none',
      zIndex: 10,
    }}>
      <div style={{
        margin: '0 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-around',
        background: '#fff',
        borderRadius: 24,
        padding: '10px 8px',
        boxShadow: '0 8px 30px -8px rgba(15,15,18,0.12), 0 1px 0 rgba(15,15,18,0.04) inset',
        border: '1px solid #EFEFF3',
        pointerEvents: 'auto',
        position: 'relative',
      }}>
        {items.map(it => {
          if (it.isFab) {
            return (
              <button key={it.id} onClick={onAdd} style={{
                width: 56, height: 56, borderRadius: 999,
                background: accent,
                color: '#fff', border: 'none', cursor: 'pointer',
                display: 'grid', placeItems: 'center',
                marginTop: raised ? -32 : 0,
                boxShadow: `0 14px 28px -8px ${accent}88, 0 0 0 6px #fff`,
                transition: 'transform 200ms',
                flexShrink: 0,
              }}>
                <IPlus size={26} stroke={2.5} />
              </button>
            );
          }
          const active = tab === it.id;
          return (
            <button key={it.id} onClick={() => onTab(it.id)} style={{
              flex: 1, padding: '8px 0',
              border: 'none', background: 'transparent', cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
              color: active ? '#0F0F12' : '#A0A0A8',
            }}>
              <it.Icon size={22} stroke={active ? 2.4 : 2} />
              <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.1 }}>{it.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
