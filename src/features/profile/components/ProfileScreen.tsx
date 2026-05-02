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
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke after the download has bound to the blob URL; immediate revoke can cancel the save dialog.
  window.setTimeout(() => URL.revokeObjectURL(url), 15_000);
}

function AvatarCircle({ url, initials, size }: { url: string | null; initials: string; size: number }) {
  const s: CSSProperties = { width: size, height: size, borderRadius: 999, flexShrink: 0, overflow: 'hidden' };
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

function SoonBadge() {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: 0.3,
        color: '#6B6B80',
        background: '#EBEBF0',
        borderRadius: 6,
        padding: '2px 6px',
        flexShrink: 0,
      }}
    >
      SOON
    </span>
  );
}

type SettingsItem = {
  label: string;
  sub?: string;
  danger?: boolean;
  soon?: boolean;
  onClick?: () => void | Promise<void>;
  /** Static file download (e.g. brand asset) */
  downloadHref?: string;
  downloadFileName?: string;
};

type ProfileScreenProps = {
  profile: ProfileRow | null;
  user: User | null;
  updateProfile: (patch: Partial<ProfileRow>) => Promise<{ data: unknown; error: unknown }>;
  lists: CategoryLists;
  onExportTransactions: () => Promise<MappedTxn[]>;
  onGoToCategories?: () => void;
};

export function ProfileScreen({
  profile,
  user,
  updateProfile,
  lists,
  onExportTransactions,
  onGoToCategories,
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
          title: 'Manage',
          items: [
            {
              label: 'Categories',
              sub: 'Edit expense, income & transfer categories',
              onClick: onGoToCategories ? () => onGoToCategories() : undefined,
            },
          ] satisfies SettingsItem[],
        },
        {
          title: 'Coming soon',
          items: [
            { label: 'Budgets', sub: 'Set monthly goals', soon: true },
            { label: 'Recurring', sub: '0 active', soon: true },
          ] satisfies SettingsItem[],
        },
        {
          title: 'Preferences',
          items: [
            { label: 'Notifications', sub: 'Coming soon', soon: true },
            {
              label: 'Currency',
              sub: `${currency} · tap to change`,
              onClick: () => void cycleCurrency(),
            },
            { label: 'Appearance', sub: 'Coming soon', soon: true },
          ] satisfies SettingsItem[],
        },
        {
          title: 'Data',
          items: [
            { label: exporting ? 'Exporting…' : 'Export data', onClick: () => void exportData() },
            {
              label: 'Download app logo',
              sub: 'SVG · same as app icon & favicon',
              downloadHref: '/logo.svg',
              downloadFileName: 'truspend-logo.svg',
            },
            { label: 'Sign out', danger: true, onClick: () => void signOut() },
          ] satisfies SettingsItem[],
        },
      ] as { title: string; items: SettingsItem[] }[],
    [currency, cycleCurrency, exportData, exporting, signOut, onGoToCategories],
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
              fontSize: 17, fontWeight: 700, letterSpacing: -0.3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {fullName}
          </div>
          <div
            style={{
              fontSize: 13, color: '#ACACB8', marginTop: 3,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}
          >
            {email}
          </div>
        </div>
      </div>

      {groups.map((group, gi) => (
        <div key={gi} className="settings-group">
          {group.items.map((it, i) => {
            const isDownload = Boolean(it.downloadHref && !it.soon);
            const interactive = typeof it.onClick === 'function' && !it.soon && !isDownload;
            const rowClass = `settings-row${isDownload ? ' settings-row--link' : ''}`;
            const inner = (
              <>
                <span
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                    color: it.soon ? '#ACACB8' : it.danger ? '#FF4D6D' : '#0F0F12',
                  }}
                >
                  {it.label}
                </span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {it.soon && <SoonBadge />}
                  {it.sub && !it.soon ? (
                    <span style={{ fontSize: 13, color: '#ACACB8' }}>{it.sub}</span>
                  ) : null}
                </div>
              </>
            );
            if (isDownload) {
              return (
                <a
                  key={i}
                  href={it.downloadHref}
                  download={it.downloadFileName ?? 'truspend-logo.svg'}
                  className={rowClass}
                >
                  {inner}
                </a>
              );
            }
            return (
              <div
                key={i}
                className={rowClass}
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
                {inner}
              </div>
            );
          })}
        </div>
      ))}

      <div style={{ height: 16 }} />
    </div>
  );
}
