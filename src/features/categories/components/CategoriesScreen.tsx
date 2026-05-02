import { useState, useMemo, type CSSProperties } from 'react';
import { CatIcon, IChevDown, IChevUp } from '@/shared/components/Icons';
import { CategoryIconPicker } from '@/features/categories/components/CategoryIconPicker';
import { sanitizeCategoryIcon } from '@/features/categories/utils/constants';
import type { CategoryLists } from '@/features/categories/hooks/useCategories';
import type { TransactionKind } from '@/types/ledger';
import type { CategoryRow } from '@/features/categories/types';
import '@/features/categories/styles/CategoriesScreen.css';

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
  onReorder: (kind: TransactionKind, id: string, direction: 'up' | 'down') => Promise<{ error?: Error | undefined }>;
  reordering?: boolean;
};

export function CategoriesScreen({
  accent,
  lists,
  onAdd,
  onRemove,
  onUpdate,
  onReorder,
  reordering = false,
}: CategoriesScreenProps) {
  const [kind, setKind] = useState<TransactionKind>('expense');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [draftIcon, setDraftIcon] = useState('dots');
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('dots');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const rows = useMemo(() => (kind === 'expense' ? lists.expense : lists.income), [kind, lists]);

  const hero = kind === 'expense' ? accent : '#22A06B';
  const accentVar = { '--cat-accent': hero } as CSSProperties;

  const startEdit = (c: CategoryRow) => {
    setConfirmDeleteId(null);
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

  const blockReorder = Boolean(editingId || confirmDeleteId || reordering);

  return (
    <div className="categories-tab categories-page" style={accentVar}>
      <div className="seg" style={{ margin: '0 16px 10px' }}>
        <div
          className={`seg-thumb${kind === 'expense' ? ' seg-thumb--rose' : ' seg-thumb--emerald'}`}
          style={{ left: kind === 'expense' ? 3 : '50%', width: 'calc(50% - 3px)' }}
        />
        {(['expense', 'income'] as const).map((k) => (
          <button
            key={k}
            type="button"
            className={`seg-btn${kind === k ? ' active' : ''}`}
            onClick={() => {
              setKind(k);
              cancelEdit();
              setConfirmDeleteId(null);
            }}
            style={{ color: kind === k ? '#0F0F12' : '#ACACB8', textTransform: 'capitalize' }}
          >
            {k}
          </button>
        ))}
      </div>

      <p className="categories-page__hint">
        Use the arrows to change the order categories appear in lists and when adding transactions. Top = first.
      </p>

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        <ul className="categories-list" aria-label={`${kind} categories`}>
          {rows.map((c, index) => (
            <li key={c.id} className="categories-row">
              {editingId === c.id ? (
                <div className="categories-row__inner">
                  <div className="categories-edit" style={{ width: '100%' }}>
                    <CategoryIconPicker value={draftIcon} onChange={setDraftIcon} activeTint={hero} />
                    <input
                      className="categories-edit__input"
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && void saveEdit()}
                      autoFocus
                      placeholder="Category name"
                    />
                    <div className="categories-edit__actions">
                      <button type="button" className="categories-edit__btn categories-edit__btn--ghost" onClick={cancelEdit}>
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="categories-edit__btn categories-edit__btn--primary"
                        disabled={!draft.trim()}
                        onClick={() => void saveEdit()}
                        style={{
                          background: draft.trim() ? hero : '#E8E8EE',
                          color: draft.trim() ? '#fff' : '#ACACB8',
                          cursor: draft.trim() ? 'pointer' : 'default',
                        }}
                      >
                        Save
                      </button>
                    </div>
                  </div>
                </div>
              ) : confirmDeleteId === c.id ? (
                <div className="categories-row__inner">
                  <div className="categories-delete" style={{ width: '100%' }}>
                    <div className="categories-delete__text">
                      Delete <strong>{c.label}</strong>?
                    </div>
                    <button
                      type="button"
                      className="categories-delete__btn categories-delete__btn--ghost"
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="categories-delete__btn categories-delete__btn--danger"
                      onClick={async () => {
                        setConfirmDeleteId(null);
                        const { error } = await onRemove(kind, c.id);
                        if (error) console.error('category delete failed', error);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <div className="categories-row__inner">
                  <div className="categories-row__reorder">
                    <button
                      type="button"
                      className="categories-row__reorder-btn"
                      aria-label={`Move ${c.label} up`}
                      disabled={blockReorder || index === 0}
                      onClick={() => void onReorder(kind, c.id, 'up')}
                    >
                      <IChevUp size={16} stroke={2.2} />
                    </button>
                    <button
                      type="button"
                      className="categories-row__reorder-btn"
                      aria-label={`Move ${c.label} down`}
                      disabled={blockReorder || index === rows.length - 1}
                      onClick={() => void onReorder(kind, c.id, 'down')}
                    >
                      <IChevDown size={16} stroke={2.2} />
                    </button>
                  </div>
                  <div className="categories-row__icon">
                    <CatIcon cat={c} size={42} radius={13} />
                  </div>
                  <div className="categories-row__label">{c.label}</div>
                  <div className="categories-row__actions">
                    {!editingId && (
                      <button type="button" className="categories-row__btn categories-row__btn--edit" onClick={() => startEdit(c)}>
                        Edit
                      </button>
                    )}
                    <button
                      type="button"
                      className="categories-row__btn categories-row__btn--delete"
                      onClick={() => setConfirmDeleteId(c.id)}
                      aria-label={`Delete ${c.label}`}
                    >
                      ×
                    </button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <footer className="categories-footer">
        <div className="categories-footer__title">New category</div>
        <CategoryIconPicker value={newIcon} onChange={setNewIcon} activeTint={hero} />
        <div className="categories-footer__row">
          <input
            className="categories-footer__input"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void addNew()}
            placeholder={`Add ${kind === 'expense' ? 'expense' : 'income'} category`}
          />
          <button
            type="button"
            className="categories-footer__create"
            disabled={!newName.trim()}
            onClick={() => void addNew()}
            style={{
              background: newName.trim() ? hero : '#E8E8EE',
              color: newName.trim() ? '#fff' : '#ACACB8',
            }}
          >
            Add
          </button>
        </div>
      </footer>
    </div>
  );
}
