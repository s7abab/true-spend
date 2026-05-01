const GROUPS = [
  {
    items: [
      { label: 'Budgets',       sub: 'Set monthly goals' },
      { label: 'Recurring',     sub: '3 active' },
    ],
  },
  {
    items: [
      { label: 'Notifications', sub: 'On' },
      { label: 'Currency',      sub: '₹ INR' },
      { label: 'Appearance',    sub: 'Light' },
    ],
  },
  {
    items: [
      { label: 'Export data' },
      { label: 'Help & support' },
      { label: 'Sign out', danger: true },
    ],
  },
];

export function ProfileScreen() {
  return (
    <div>
      {/* avatar card */}
      <div style={{ margin: '16px 16px 0', background: '#fff', borderRadius: 20, padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 60, height: 60, borderRadius: 999,
          background: 'linear-gradient(135deg, #FFD0A8, #FF8FB1)',
          color: '#fff', fontWeight: 700, fontSize: 22,
          display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>AR</div>
        <div>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3 }}>Aarav Reddy</div>
          <div style={{ fontSize: 13, color: '#ACACB8', marginTop: 3 }}>aarav@penny.ai</div>
        </div>
      </div>

      {/* setting groups */}
      {GROUPS.map((group, gi) => (
        <div key={gi} className="settings-group">
          {group.items.map((it, i) => (
            <div key={i} className="settings-row">
              <span style={{ fontSize: 15, fontWeight: 500, color: it.danger ? '#FF4D6D' : '#0F0F12' }}>{it.label}</span>
              {it.sub && <span style={{ fontSize: 13, color: '#ACACB8' }}>{it.sub}</span>}
            </div>
          ))}
        </div>
      ))}

      <div style={{ height: 16 }} />
    </div>
  );
}
