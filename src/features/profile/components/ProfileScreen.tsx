import { useCallback, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useAuth } from '@/features/auth/components/AuthContext';
import { LegalFooterLinks } from '@/features/legal/components/LegalFooterLinks';
import { IDownload } from '@/shared/components/Icons';
import { resolveAvatarUrl } from '@/utils/avatar';
import type { ProfileRow } from '@/features/profile/types';
import type { User } from '@supabase/supabase-js';
import type { CategoryLists } from '@/features/categories/hooks/useCategories';
import type { MappedTxn } from '@/utils/txnMap';
import { currencyOptionLabel, listSelectableCurrencyCodes } from '@/utils/currencyList';

function initialsOf(name = '', email = ''): string {
  const src = (name || email || '').trim();
  if (!src) return '?';
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return src.slice(0, 2).toUpperCase();
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
  /** Inline `<select>` for currency (avoids whole-row tap). */
  currencyPicker?: boolean;
  /** Inline `<select>` for export format (Excel / PDF). */
  exportFormatPicker?: boolean;
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
  const [exportFormatValue, setExportFormatValue] = useState<'excel' | 'pdf'>('excel');
  const exportBusy = useRef(false);

  const fullName =
    profile?.full_name
    || (user?.user_metadata?.full_name as string | undefined)
    || (user?.user_metadata?.name as string | undefined)
    || 'There';
  const email = profile?.email || user?.email || '';
  const avatarUrl = resolveAvatarUrl(profile, user);
  const currency = (profile?.currency || 'INR').toUpperCase();
  const initials = initialsOf(fullName, email);

  const currencyCodes = useMemo(() => listSelectableCurrencyCodes(), []);

  const currencySelectOptions = useMemo(() => {
    if (currencyCodes.includes(currency)) return currencyCodes;
    return [currency, ...currencyCodes];
  }, [currencyCodes, currency]);

  const onCurrencyChange = useCallback(
    async (code: string) => {
      const next = code.trim().toUpperCase();
      const { error } = await updateProfile({ currency: next });
      if (error) console.error('update currency failed', error);
    },
    [updateProfile],
  );

  const exportInFormat = useCallback(
    async (format: 'pdf' | 'excel') => {
      if (!onExportTransactions || exportBusy.current) return;
      exportBusy.current = true;
      setExporting(true);
      try {
        const transactions = await onExportTransactions();
        const bundle = {
          exportedAt: new Date().toISOString(),
          profile,
          categories: lists,
          transactions,
        };
        const mod = await import('@/features/profile/lib/exportDataFormats');
        if (format === 'pdf') mod.downloadExportPdf(bundle);
        else mod.downloadExportExcel(bundle);
      } catch (e) {
        console.error('export failed', e);
      } finally {
        exportBusy.current = false;
        setExporting(false);
      }
    },
    [profile, lists, onExportTransactions],
  );

  const groups = useMemo(
    () =>
      [
        {
          title: 'Manage',
          items: [
            {
              label: 'Categories',
              sub: 'Edit categories',
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
            { label: 'Currency', currencyPicker: true },
            { label: 'Appearance', sub: 'Coming soon', soon: true },
          ] satisfies SettingsItem[],
        },
        {
          title: 'Data',
          items: [
            { label: 'Export', exportFormatPicker: true },
            { label: 'Sign out', danger: true, onClick: () => void signOut() },
          ] satisfies SettingsItem[],
        },
      ] as { title: string; items: SettingsItem[] }[],
    [signOut, onGoToCategories],
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
            if (it.currencyPicker) {
              return (
                <div key={i} className="settings-row settings-row--currency">
                  <span className="settings-row__label">{it.label}</span>
                  <select
                    className="settings-currency-select"
                    aria-label="Currency"
                    value={currency}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => void onCurrencyChange(e.target.value)}
                  >
                    {currencySelectOptions.map((code) => (
                      <option key={code} value={code} title={currencyOptionLabel(code)}>
                        {code}
                      </option>
                    ))}
                  </select>
                </div>
              );
            }

            if (it.exportFormatPicker) {
              return (
                <div key={i} className="settings-row settings-row--currency settings-row--export-row">
                  <span className="settings-row__label">{it.label}</span>
                  <div className="settings-export-right">
                    <select
                      className="settings-currency-select settings-currency-select--export-compact"
                      aria-label="Export format"
                      value={exportFormatValue}
                      disabled={exporting}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => setExportFormatValue(e.target.value as 'excel' | 'pdf')}
                    >
                      <option value="excel">Excel</option>
                      <option value="pdf">PDF</option>
                    </select>
                    <button
                      type="button"
                      className="settings-export-icon-btn"
                      disabled={exporting}
                      aria-label={exporting ? 'Exporting…' : 'Download'}
                      aria-busy={exporting}
                      onClick={() => void exportInFormat(exportFormatValue)}
                    >
                      <IDownload size={18} stroke={2} />
                    </button>
                  </div>
                </div>
              );
            }

            const interactive = typeof it.onClick === 'function' && !it.soon;
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
                {inner}
              </div>
            );
          })}
        </div>
      ))}

      <div style={{ marginTop: 8, paddingTop: 8 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: '#ACACB8', marginBottom: 8, paddingLeft: 4 }}>
          Legal
        </div>
        <LegalFooterLinks variant="inline" />
      </div>

      <div style={{ height: 16 }} />
    </div>
  );
}
