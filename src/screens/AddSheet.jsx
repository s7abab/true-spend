import { useState, useMemo } from 'react';
import { IClose, ICalendar, IChevDown, IChevLeft, IChevRight, IPlus, ICON_MAP } from '../components/Icons';
import { CATEGORIES_EXPENSE as CAT_EXP, CATEGORIES_INCOME as CAT_INC } from '../data/categories';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES   = ['Su','Mo','Tu','We','Th','Fr','Sa'];
const TODAY       = new Date(); TODAY.setHours(0,0,0,0);

/* ── Inline Calendar Component ── */
function Calendar({ selected, onSelect, heroColor }) {
  const [viewYear,  setViewYear]  = useState(selected.getFullYear());
  const [viewMonth, setViewMonth] = useState(selected.getMonth());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const isNextDisabled = false;

  // Build calendar grid
  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday    = (d) => d === TODAY.getDate() && viewMonth === TODAY.getMonth() && viewYear === TODAY.getFullYear();
  const isSelected = (d) => d === selected.getDate() && viewMonth === selected.getMonth() && viewYear === selected.getFullYear();

  return (
    <div style={{ padding: '0 16px 16px', animation: 'calFade 180ms ease' }}>
      {/* month nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <button onClick={prevMonth} style={{ width: 36, height: 36, border: 'none', background: '#F4F5F7', borderRadius: 10, display: 'grid', placeItems: 'center', cursor: 'pointer', color: '#0F0F12' }}>
          <IChevLeft size={16} />
        </button>
        <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: -0.3 }}>
          {MONTH_NAMES[viewMonth]} {viewYear}
        </div>
        <button onClick={nextMonth} disabled={isNextDisabled} style={{ width: 36, height: 36, border: 'none', background: '#F4F5F7', borderRadius: 10, display: 'grid', placeItems: 'center', cursor: isNextDisabled ? 'default' : 'pointer', color: '#0F0F12', opacity: isNextDisabled ? 0.3 : 1 }}>
          <IChevRight size={16} />
        </button>
      </div>

      {/* day-of-week header */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 6 }}>
        {DAY_NAMES.map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#ACACB8', padding: '4px 0', letterSpacing: 0.2 }}>{d}</div>
        ))}
      </div>

      {/* date grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '3px 0' }}>
        {cells.map((day, i) => {
          if (!day) return <div key={`e${i}`} />;
          const sel   = isSelected(day);
          const today = isToday(day);
          return (
            <button
              key={day}
              onClick={() => onSelect(new Date(viewYear, viewMonth, day))}
              style={{
                width: '100%', aspectRatio: '1',
                border: 'none', borderRadius: 999, cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 14, fontWeight: sel ? 700 : today ? 600 : 400,
                background: sel ? heroColor : 'transparent',
                color: sel ? '#fff' : today ? heroColor : '#0F0F12',
                display: 'grid', placeItems: 'center',
                transition: 'background 140ms',
                outline: today && !sel ? `2px solid ${heroColor}` : 'none',
                outlineOffset: '-2px',
              }}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ── Helpers ── */
function formatDateLabel(date) {
  const today     = TODAY;
  const yesterday = new Date(TODAY); yesterday.setDate(TODAY.getDate() - 1);
  if (date.toDateString() === today.toDateString())     return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
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

/* ── Main AddSheet ── */
export function AddSheet({ accent, onClose, onSave }) {
  const [kind,           setKind]           = useState('expense');
  const [amount,         setAmount]         = useState('0');
  const [catId,          setCatId]          = useState('food');
  const [note,           setNote]           = useState('');
  const [selectedDate,   setSelectedDate]   = useState(new Date(TODAY));
  const [showCal,        setShowCal]        = useState(false);

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

  const numAmount  = parseFloat(amount) || 0;
  const canSave    = numAmount > 0;
  const dateLabel  = useMemo(() => formatDateLabel(selectedDate), [selectedDate]);

  const formatted = amount === '0'
    ? '0'
    : Number(amount.split('.')[0]).toLocaleString('en-IN') + (amount.includes('.') ? '.' + amount.split('.')[1] : '');

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setShowCal(false);
  };

  const doSave = () => {
    if (!canSave) return;
    onSave({ kind, cat: catId, amount: numAmount, title: note.trim() || cat.label, time: dateLabel });
  };

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />

        {/* header: close + toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px 0' }}>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 10, background: '#F4F5F7', border: 'none', display: 'grid', placeItems: 'center', color: '#6B6B80', flexShrink: 0 }}>
            <IClose size={16} />
          </button>
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

        {/* amount + date pill */}
        <div style={{ padding: '20px 24px 14px', textAlign: 'center', borderBottom: showCal ? 'none' : '1px solid #F5F5F8' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 3 }}>
            <span style={{ fontSize: 24, fontWeight: 600, opacity: 0.35, verticalAlign: 'top', marginTop: 8, display: 'inline-block' }}>₹</span>
            <span style={{ fontSize: 52, fontWeight: 700, letterSpacing: -2, lineHeight: 1, color: numAmount > 0 ? heroColor : '#D1D1DB', transition: 'color 200ms' }}>
              {formatted}
            </span>
          </div>

          <button onClick={() => setShowCal(v => !v)} style={{
            marginTop: 10,
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '6px 13px', borderRadius: 999,
            background: showCal ? heroColor : '#F4F5F7',
            color: showCal ? '#fff' : '#6B6B80',
            border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
            transition: 'background 180ms, color 180ms',
          }}>
            <ICalendar size={13} stroke={2} />
            {dateLabel}
            <IChevDown size={12} style={{ transform: showCal ? 'rotate(180deg)' : 'none', transition: 'transform 200ms' }} />
          </button>
        </div>

        {/* ── Inline Calendar ── */}
        {showCal && (
          <div style={{ borderBottom: '1px solid #F5F5F8' }}>
            <Calendar selected={selectedDate} onSelect={handleDateSelect} heroColor={heroColor} />
          </div>
        )}

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

        {/* note */}
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

        {/* keypad — hidden while calendar is open so sheet doesn't get too tall */}
        {!showCal && <Keypad onPress={press} />}

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
