export function AppTopBar({ children, onProfile }) {
  return (
    <div className="app-top-bar screen-header" style={{ display: 'flex', gap: 12, padding: '10px 16px 12px' }}>
      <div className="app-top-bar__title">{children}</div>
      <div className="app-top-bar__profile">
        <button
          type="button"
          onClick={onProfile}
          aria-label="Profile"
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            border: 'none',
            background: 'linear-gradient(135deg, #FFD0A8, #FF8FB1)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          }}
        >
          AR
        </button>
      </div>
    </div>
  );
}
