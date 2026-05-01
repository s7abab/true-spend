import { resolveAvatarUrl } from '../utils/avatar';

function initialsOf(name = '', email = '') {
  const src = (name || email || '').trim();
  if (!src) return '?';
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export function AppTopBar({ children, onProfile, profile, user }) {
  const avatarUrl = resolveAvatarUrl(profile, user);
  const initials  = initialsOf(
    profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name,
    profile?.email || user?.email,
  );

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
            padding: 0,
            background: avatarUrl ? 'transparent' : 'linear-gradient(135deg, #FFD0A8, #FF8FB1)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            fontFamily: 'inherit',
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            flexShrink: 0,
          }}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt=""
              referrerPolicy="no-referrer"
              style={{ width: 40, height: 40, objectFit: 'cover', display: 'block' }}
            />
          ) : (
            initials
          )}
        </button>
      </div>
    </div>
  );
}
