import { useState, useMemo } from 'react';
import { CatIcon } from '@/shared/components/Icons';
import { CategoryIconPicker } from '@/features/categories/components/CategoryIconPicker';
import { sanitizeCategoryIcon } from '@/features/categories/utils/constants';
import type { CategoryLists } from '@/features/categories/hooks/useCategories';
import type { TransactionKind } from '@/types/ledger';
import type { CategoryRow } from '@/features/categories/types';

type CategoriesScreenProps = {
  accent: string;
  lists: CategoryLists;
  onAdd: (kind: TransactionKind, label: string, icon?: string) => Promise<{ error?: Error | null; data?: unknown }>;
  onRemove: (kind: TransactionKind, id: string) => Promise<{ error?: Error | null }>;
  onUpdate: (
    kind: TransactionKind,
    id: string,
    patch: { label: string; icon: string },
  ) => Promise<{ error?: Error | null }>;
};

export function CategoriesScreen({ accent, lists, onAdd, onRemove, onUpdate }: CategoriesScreenProps) {
  const [kind, setKind] = useState<TransactionKind>('expense');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [draftIcon, setDraftIcon] = useState('dots');
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('dots');

  const rows = useMemo(() => (kind === 'expense' ? lists.expense : lists.income), [kind, lists]);

  const startEdit = (c: CategoryRow) => {
    setEditingId(c.id);
    setDraft(c.label);
    setDraftIcon(sanitizeCategoryIcon(c.icon));
  };

  const cancelEdit = () => {
    setEditingId(null);
    setDraft('');
    setDraftIcon('dots');
  };

  const saveEdit = async () => {
    if (!editingId || !draft.trim()) return;
    const { error } = await onUpdate(kind, editingId, { label: draft.trim(), icon: draftIcon });
    if (error) console.error('category update failed', error);
    cancelEdit();
  };

  const addNew = async () => {
    const t = newName.trim();
    if (!t) return;
    const { error } = await onAdd(kind, t, newIcon);
    if (error) console.error('category add failed', error);
    else {
      setNewName('');
      setNewIcon('dots');
    }
  };

  const hero = kind === 'expense' ? accent : '#22A06B';

  return (
    <div className="categories-tab">
      <div className="seg" style={{ margin: '0 16px 12px' }}>
        <div className="seg-thumb" style={{ left: kind === 'expense' ? 3 : '50%', width: 'calc(50% - 3px)' }} />
        {(['expense', 'income'] as const).map((k) => (
          <button
            key={k}
            type="button"
            className={`seg-btn${kind === k ? ' active' : ''}`}
            onClick={() => {
              setKind(k);
              cancelEdit();
            }}
            style={{ color: kind === k ? '#0F0F12' : '#ACACB8', textTransform: 'capitalize' }}
          >
            {k}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px' }}>
        <div style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', marginBottom: 12 }}>
          {rows.map((c) => (
            <div
              key={c.id}
              style={{
                borderBottom: '1px solid #F5F5F8',
                padding: '12px 14px',
              }}
            >
              {editingId === c.id ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <CategoryIconPicker value={draftIcon} onChange={setDraftIcon} activeTint={hero} />
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && void saveEdit()}
                    autoFocus
                    placeholder="Name"
                    style={{
                      width: '100%',
                      height: 42,
                      borderRadius: 10,
                      border: 'none',
                      background: '#F4F5F7',
                      padding: '0 12px',
                      fontSize: 15,
                      outline: 'none',
                      fontFamily: 'inherit',
                    }}
                  />
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 10,
                        border: 'none',
                        background: '#F4F5F7',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={!draft.trim()}
                      onClick={() => void saveEdit()}
                      style={{
                        padding: '8px 14px',
                        borderRadius: 10,
                        border: 'none',
                        background: draft.trim() ? hero : '#E8E8EE',
                        color: draft.trim() ? '#fff' : '#ACACB8',
                        fontWeight: 600,
                        fontSize: 13,
                        cursor: draft.trim() ? 'pointer' : 'default',
                        fontFamily: 'inherit',
                      }}
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ flexShrink: 0 }}>
                    <CatIcon cat={c} size={40} radius={12} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: -0.2 }}>{c.label}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => startEdit(c)}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: hero,
                      fontWeight: 600,
                      fontSize: 13,
                      padding: '8px 4px',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      flexShrink: 0,
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const { error } = await onRemove(kind, c.id);
                      if (error) console.error('category delete failed', error);
                    }}
                    style={{
                      border: 'none',
                      background: 'transparent',
                      color: '#ACACB8',
                      fontSize: 22,
                      lineHeight: 1,
                      padding: '4px 8px',
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                    aria-label={`Delete ${c.label}`}
                  >
                    ×
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          padding: '12px 16px',
          paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
          background: '#F2F2F7',
          borderTop: '1px solid #E8E8EE',
        }}
      >
        <div style={{ fontSize: 12, fontWeight: 600, color: '#ACACB8', marginBottom: 10 }}>New category</div>
        <CategoryIconPicker value={newIcon} onChange={setNewIcon} activeTint={hero} />
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void addNew()}
            placeholder="Name"
            style={{
              flex: 1,
              height: 46,
              borderRadius: 12,
              border: 'none',
              background: '#fff',
              padding: '0 14px',
              fontSize: 15,
              outline: 'none',
              fontFamily: 'inherit',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
          />
          <button
            type="button"
            disabled={!newName.trim()}
            onClick={() => void addNew()}
            style={{
              height: 46,
              padding: '0 20px',
              borderRadius: 12,
              border: 'none',
              fontWeight: 700,
              fontSize: 14,
              background: newName.trim() ? hero : '#E8E8EE',
              color: newName.trim() ? '#fff' : '#ACACB8',
              cursor: newName.trim() ? 'pointer' : 'default',
              fontFamily: 'inherit',
              flexShrink: 0,
            }}
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
