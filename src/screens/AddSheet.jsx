import { useState, useMemo } from 'react';
import { IClose, ICalendar, IChevDown, IPlus, ICON_MAP } from '../components/Icons';
import { CATEGORIES_EXPENSE as CAT_EXP, CATEGORIES_INCOME as CAT_INC } from '../data/categories';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const NOW    = new Date(2026, 4, 1);

function getDateLabel(offset) {
  const d = new Date(NOW);
  d.setDate(d.getDate() + offset);
  if (offset === 0)  return 'Today';
  if (offset === -1) return 'Yesterday';
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

function Keypad({ onPress }) {
  const keys = ['1','2','3','4','5','6','7','8','9','.','0','del'];
  return (
    <div className="keypad">
      {keys.map(k => (
        <button key={k} className="key" onClick={() => onPress(k)}>
          {k === 'del' ? <IClose size={20} stroke={2.2} /> : k}
        </button>
      ))}
    </div>
  );
}

export function AddSheet({ accent, onClose, onSave }) {
  const [kind,           setKind]           = useState('expense');
  const [amount,         setAmount]         = useState('0');
  const [catId,          setCatId]          = useState('food');
  const [note,           setNote]           = useState('');
  const [dateOffset,     setDateOffset]     = useState(0);
  const [showDatePicker, setShowDatePicker] = useState(false);

  const cats      = kind === 'expense' ? CAT_EXP : CAT_INC;
  const cat       = cats.find(c => c.id === catId) || cats[0];
  const isExp     = kind === 'expense';
  const heroColor = isExp ? accent : '#22A06B';

  const handleKind = (k) => { setKind(k); setCatId(k === 'expense' ? 'food' : 'salary'); };

  const press = (k) => {
    setAmount(prev => {
      if (k === 'del') return prev.length <= 1 ? '0' : prev.slice(0, -1);
      if (k === '.') return prev.includes('.') ? prev : prev + '.';
      if (prev === '0' && k !== '.') return String(k);
      if (prev.replace('.', '').length >= 7) return prev;
      return prev + k;
    });
  };

  const numAmount = parseFloat(amount) || 0;
  const canSave   = numAmount > 0;

  const formatted = amount === '0'
    ? '0'
    : Number(amount.split('.')[0]).toLocaleString('en-IN') + (amount.includes('.') ? '.' + amount.split('.')[1] : '');

  const dateLabel = useMemo(() => getDateLabel(dateOffset), [dateOffset]);

  const doSave = () => {
    if (!canSave) return;
    onSave({ kind, cat: catId, amount: numAmount, title: note.trim() || cat.label, time: dateLabel });
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />

        {/* top row: close + toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 0' }}>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: '#F4F5F7', border: 'none', display: 'grid', placeItems: 'center', color: '#6B6B80', flexShrink: 0 }}>
            <IClose size={16} />
          </button>

          {/* expense / income segmented */}
          <div className="seg" style={{ flex: 1 }}>
            <div className="seg-thumb" style={{ left: isExp ? 3 : '50%', width: 'calc(50% - 3px)' }} />
            {['expense', 'income'].map(t => (
              <button key={t} className={`seg-btn${kind === t ? ' active' : ''}`}
                onClick={() => handleKind(t)}
                style={{ color: kind === t ? '#0F0F12' : '#ACACB8', textTransform: 'capitalize' }}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* amount */}
        <div style={{ padding: '20px 24px 14px', textAlign: 'center', borderBottom: '1px solid #F5F5F8' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 3 }}>
            <span style={{ fontSize: 24, fontWeight: 600, opacity: 0.35, verticalAlign: 'top', marginTop: 8, display: 'inline-block' }}>₹</span>
            <span style={{ fontSize: 52, fontWeight: 700, letterSpacing: -2, lineHeight: 1, color: numAmount > 0 ? heroColor : '#D1D1DB', transition: 'color 200ms' }}>
              {formatted}
            </span>
          </div>

          {/* date pill */}
          <button onClick={() => setShowDatePicker(v => !v)} style={{
            marginTop: 10,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '5px 11px', borderRadius: 999,
            background: showDatePicker ? heroColor + '14' : '#F4F5F7',
            color: showDatePicker ? heroColor : '#6B6B80',
            border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 600,
          }}>
            <ICalendar size={12} stroke={2} />
            {dateLabel}
            <IChevDown size={11} style={{ transform: showDatePicker ? 'rotate(180deg)' : 'none', transition: 'transform 180ms' }} />
          </button>

          {/* date strip */}
          {showDatePicker && (
            <div style={{ display: 'flex', gap: 5, overflowX: 'auto', marginTop: 10, paddingBottom: 2 }}>
              {Array.from({ length: 14 }, (_, i) => -i).map(off => {
                const d = new Date(NOW); d.setDate(d.getDate() + off);
                const active = off === dateOffset;
                return (
                  <button key={off} onClick={() => { setDateOffset(off); setShowDatePicker(false); }} style={{
                    flexShrink: 0, width: 44, padding: '6px 0',
                    borderRadius: 10, border: 'none', cursor: 'pointer',
                    background: active ? heroColor : '#F4F5F7',
                    color: active ? '#fff' : '#0F0F12',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                  }}>
                    <div style={{ fontSize: 8, fontWeight: 700, opacity: 0.7 }}>
                      {off === 0 ? 'TODAY' : d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700 }}>{d.getDate()}</div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* category strip */}
        <div className="cat-strip" style={{ borderBottom: '1px solid #F5F5F8' }}>
          {cats.map(c => {
            const active  = c.id === catId;
            const IconCmp = ICON_MAP[c.icon] || ICON_MAP.dots;
            return (
              <button key={c.id} className="cat-btn" onClick={() => setCatId(c.id)} style={{
                background: active ? c.tint : '#F4F5F7',
                color:      active ? '#fff'  : '#0F0F12',
                boxShadow:  active ? `0 4px 12px -4px ${c.tint}88` : 'none',
              }}>
                <span style={{
                  width: 24, height: 24, borderRadius: 7, flexShrink: 0,
                  background: active ? 'rgba(255,255,255,0.2)' : c.tint + '18',
                  color: active ? '#fff' : c.tint,
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <IconCmp size={13} stroke={2.2} />
                </span>
                {c.label}
              </button>
            );
          })}
        </div>

        {/* note input */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #F5F5F8' }}>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note (optional)"
            style={{
              width: '100%', height: 40,
              background: '#F4F5F7', border: 'none', borderRadius: 10,
              padding: '0 14px', fontSize: 14, color: '#0F0F12',
              outline: 'none', fontFamily: 'inherit',
            }}
          />
        </div>

        {/* keypad */}
        <Keypad onPress={press} />

        {/* add button */}
        <div style={{ padding: '10px 16px', paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}>
          <button disabled={!canSave} onClick={doSave} style={{
            width: '100%', height: 54, borderRadius: 16,
            background: canSave ? heroColor : '#F0F0F5',
            color: canSave ? '#fff' : '#ACACB8',
            border: 'none', cursor: canSave ? 'pointer' : 'default',
            fontSize: 17, fontWeight: 700, letterSpacing: -0.3,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            boxShadow: canSave ? `0 10px 24px -8px ${heroColor}99` : 'none',
            transition: 'background 200ms, box-shadow 200ms',
            fontFamily: 'inherit',
          }}
            onPointerDown={e => canSave && (e.currentTarget.style.transform = 'scale(0.98)')}
            onPointerUp={e => (e.currentTarget.style.transform = '')}
          >
            <IPlus size={20} stroke={2.6} />
            Add {isExp ? 'expense' : 'income'}
          </button>
        </div>
      </div>
    </div>
  );
}
