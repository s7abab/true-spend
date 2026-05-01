import { useCallback, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useAuth } from '@/features/auth/components/AuthContext';
import { resolveAvatarUrl } from '@/utils/avatar';
import type { ProfileRow } from '@/features/profile/types';
import type { User } from '@supabase/supabase-js';
import type { CategoryLists } from '@/features/categories/hooks/useCategories';
import type { MappedTxn } from '@/utils/txnMap';

const CURRENCIES = ['INR', 'USD', 'EUR'] as const;

function initialsOf(name = '', email = ''): string {
  const src = (name || email || '').trim();
  if (!src) return '?';
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function AvatarCircle({ url, initials, size }: { url: string | null; initials: string; size: number }) {
  const s: CSSProperties = {
    width: size,
    height: size,
    borderRadius: 999,
    flexShrink: 0,
    overflow: 'hidden',
  };
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
    <div
      style={{
        ...s,
        background: 'linear-gradient(135deg, #FFD0A8, #FF8FB1)',
        color: '#fff',
        fontWeight: 700,
        fontSize: size * 0.36,
        display: 'grid',
        placeItems: 'center',
      }}
    >
      {initials}
    </div>
  );
}

type SettingsItem = {
  label: string;
  sub?: string;
  danger?: boolean;
  onClick?: () => void | Promise<void>;
};

type ProfileScreenProps = {
  profile: ProfileRow | null;
  user: User | null;
  updateProfile: (patch: Partial<ProfileRow>) => Promise<{ data: unknown; error: unknown }>;
  lists: CategoryLists;
  onExportTransactions: () => Promise<MappedTxn[]>;
};

export function ProfileScreen({
  profile,
  user,
  updateProfile,
  lists,
  onExportTransactions,
}: ProfileScreenProps) {
  const { signOut } = useAuth();
  const [exporting, setExporting] = useState(false);
  const exportBusy = useRef(false);

  const fullName =
    profile?.full_name
    || (user?.user_metadata?.full_name as string | undefined)
    || (user?.user_metadata?.name as string | undefined)
    || 'There';
  const email = profile?.email || user?.email || '';
  const avatarUrl = resolveAvatarUrl(profile, user);
  const currency = profile?.currency || 'INR';
  const initials = initialsOf(fullName, email);

  const cycleCurrency = useCallback(async () => {
    const idx = CURRENCIES.indexOf((currency || 'INR').toUpperCase() as (typeof CURRENCIES)[number]);
    const next = CURRENCIES[(Math.max(0, idx) + 1) % CURRENCIES.length]!;
    const { error } = await updateProfile({ currency: next });
    if (error) console.error('update currency failed', error);
  }, [updateProfile, currency]);

  const exportData = useCallback(async () => {
    if (!onExportTransactions || exportBusy.current) return;
    exportBusy.current = true;
    setExporting(true);
    try {
      const transactions = await onExportTransactions();
      downloadJson(`truspend-export-${new Date().toISOString().slice(0, 10)}.json`, {
        exportedAt: new Date().toISOString(),
        profile,
        categories: lists,
        transactions,
      });
    } catch (e) {
      console.error('export failed', e);
    } finally {
      exportBusy.current = false;
      setExporting(false);
    }
  }, [profile, lists, onExportTransactions]);

  const groups = useMemo(
    () =>
      [
        {
          items: [
            { label: 'Budgets', sub: 'Set monthly goals' },
            { label: 'Recurring', sub: '0 active' },
          ] satisfies SettingsItem[],
        },
        {
          items: [
            { label: 'Notifications', sub: 'On' },
            {
              label: 'Currency',
              sub: `${currency} · tap to change`,
              onClick: () => void cycleCurrency(),
            },
            { label: 'Appearance', sub: 'Light' },
          ] satisfies SettingsItem[],
        },
        {
          items: [
            { label: exporting ? 'Exporting…' : 'Export data', onClick: () => void exportData() },
            { label: 'Help & support' },
            { label: 'Sign out', danger: true, onClick: () => void signOut() },
          ] satisfies SettingsItem[],
        },
      ] as { items: SettingsItem[] }[],
    [currency, cycleCurrency, exportData, exporting, signOut],
  );

  return (
    <div>
      <div
        style={{
          margin: '16px 16px 0',
          background: '#fff',
          borderRadius: 20,
          padding: '20px 18px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <AvatarCircle url={avatarUrl} initials={initials} size={60} />
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: 17,
              fontWeight: 700,
              letterSpacing: -0.3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {fullName}
          </div>
          <div
            style={{
              fontSize: 13,
              color: '#ACACB8',
              marginTop: 3,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {email}
          </div>
        </div>
      </div>

      {groups.map((group, gi) => (
        <div key={gi} className="settings-group">
          {group.items.map((it, i) => {
            const interactive = typeof it.onClick === 'function';
            return (
              <div
                key={i}
                className="settings-row"
                onClick={interactive ? () => void it.onClick?.() : undefined}
                onKeyDown={
                  interactive
                    ? (e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          void it.onClick?.();
                        }
                      }
                    : undefined
                }
                role={interactive ? 'button' : undefined}
                tabIndex={interactive ? 0 : undefined}
                style={interactive ? { cursor: 'pointer' } : undefined}
              >
                <span style={{ fontSize: 15, fontWeight: 500, color: it.danger ? '#FF4D6D' : '#0F0F12' }}>
                  {it.label}
                </span>
                {it.sub ? <span style={{ fontSize: 13, color: '#ACACB8' }}>{it.sub}</span> : null}
              </div>
            );
          })}
        </div>
      ))}

      <div style={{ height: 16 }} />
    </div>
  );
}
