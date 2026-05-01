import { useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { resolveAvatarUrl } from '../utils/avatar';

const CURRENCIES = ['INR', 'USD', 'EUR'];

function initialsOf(name = '', email = '') {
  const src = (name || email || '').trim();
  if (!src) return '?';
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function AvatarCircle({ url, initials, size }) {
  const s = { width: size, height: size, borderRadius: 999, flexShrink: 0, overflow: 'hidden' };
  if (url) {
    return (
      <img
        src={url}
        alt=""
        referrerPolicy="no-referrer"
        style={{ ...s, objectFit: 'cover', display: 'block', background: '#F4F5F7' }}
      />
    );
  }
  return (
    <div style={{
      ...s,
      background: 'linear-gradient(135deg, #FFD0A8, #FF8FB1)',
      color: '#fff', fontWeight: 700, fontSize: size * 0.36,
      display: 'grid', placeItems: 'center',
    }}>
      {initials}
    </div>
  );
}

export function ProfileScreen({ profile, user, updateProfile, lists, txns }) {
  const { signOut } = useAuth();

  const fullName  = profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'There';
  const email     = profile?.email || user?.email || '';
  const avatarUrl = resolveAvatarUrl(profile, user);
  const currency  = profile?.currency || 'INR';
  const initials  = initialsOf(fullName, email);

  const cycleCurrency = useCallback(async () => {
    if (!updateProfile) return;
    const idx = CURRENCIES.indexOf((currency || 'INR').toUpperCase());
    const next = CURRENCIES[(Math.max(0, idx) + 1) % CURRENCIES.length];
    const { error } = await updateProfile({ currency: next });
    if (error) console.error('update currency failed', error);
  }, [updateProfile, currency]);

  const exportData = useCallback(() => {
    downloadJson(`truspend-export-${new Date().toISOString().slice(0, 10)}.json`, {
      exportedAt: new Date().toISOString(),
      profile,
      categories: lists,
      transactions: txns,
    });
  }, [profile, lists, txns]);

  const groups = useMemo(() => [
    {
      items: [
        { label: 'Budgets',   sub: 'Set monthly goals' },
        { label: 'Recurring', sub: '0 active' },
      ],
    },
    {
      items: [
        { label: 'Notifications', sub: 'On' },
        {
          label: 'Currency',
          sub:   `${currency} · tap to change`,
          onClick: cycleCurrency,
        },
        { label: 'Appearance', sub: 'Light' },
      ],
    },
    {
      items: [
        { label: 'Export data', onClick: exportData },
        { label: 'Help & support' },
        { label: 'Sign out', danger: true, onClick: () => signOut() },
      ],
    },
  ], [currency, cycleCurrency, exportData, signOut]);

  return (
    <div>
      {/* avatar card */}
      <div style={{ margin: '16px 16px 0', background: '#fff', borderRadius: 20, padding: '20px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <AvatarCircle url={avatarUrl} initials={initials} size={60} />
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: -0.3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {fullName}
          </div>
          <div style={{ fontSize: 13, color: '#ACACB8', marginTop: 3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {email}
          </div>
        </div>
      </div>

      {/* setting groups */}
      {groups.map((group, gi) => (
        <div key={gi} className="settings-group">
          {group.items.map((it, i) => {
            const interactive = typeof it.onClick === 'function';
            return (
              <div
                key={i}
                className="settings-row"
                onClick={interactive ? it.onClick : undefined}
                onKeyDown={interactive ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); it.onClick(); } } : undefined}
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                style={interactive ? { cursor: 'pointer' } : undefined}
              >
                <span style={{ fontSize: 15, fontWeight: 500, color: it.danger ? '#FF4D6D' : '#0F0F12' }}>{it.label}</span>
                {it.sub && <span style={{ fontSize: 13, color: '#ACACB8' }}>{it.sub}</span>}
              </div>
            );
          })}
        </div>
      ))}

      <div style={{ height: 16 }} />
    </div>
  );
}
