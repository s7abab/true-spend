import type { ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { resolveAvatarUrl } from '@/utils/avatar';
import type { ProfileRow } from '@/features/profile/types';

function initialsOf(name = '', email = ''): string {
  const src = (name || email || '').trim();
  if (!src) return '?';
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

type AppTopBarProps = {
  children: ReactNode;
  onProfile: () => void;
  profile: ProfileRow | null | undefined;
  user: User | null | undefined;
};

export function AppTopBar({ children, onProfile, profile, user }: AppTopBarProps) {
  const avatarUrl = resolveAvatarUrl(profile, user);
  const initials = initialsOf(
    profile?.full_name
      || (user?.user_metadata?.full_name as string | undefined)
      || (user?.user_metadata?.name as string | undefined)
      || '',
    profile?.email || user?.email || '',
  );

  return (
    <div className="app-top-bar screen-header" style={{ display: 'flex', gap: 12 }}>
      <div className="app-top-bar__brand">
        <img className="app-top-bar__logo" src="/logo.svg" alt="Truspend" width={40} height={40} decoding="async" />
        <div className="app-top-bar__title">{children}</div>
      </div>
      <div className="app-top-bar__profile">
        <button
          type="button"
          onClick={onProfile}
          aria-label="Profile"
          style={{
            width: 44,
            height: 44,
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
              loading="lazy"
              decoding="async"
              width={44}
              height={44}
              style={{ width: 40, height: 40, objectFit: 'cover', display: 'block', borderRadius: 999 }}
            />
          ) : (
            initials
          )}
        </button>
      </div>
    </div>
  );
}
