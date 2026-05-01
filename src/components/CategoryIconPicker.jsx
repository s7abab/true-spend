import { ICON_MAP } from './Icons';
import { CATEGORY_ICON_PICKER_KEYS } from '../data/categories';

export function CategoryIconPicker({ value, onChange, activeTint }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#ACACB8', marginBottom: 8, letterSpacing: 0.2 }}>Icon</div>
      <div
        style={{
          display: 'flex',
          gap: 6,
          overflowX: 'auto',
          paddingBottom: 4,
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {CATEGORY_ICON_PICKER_KEYS.map((key) => {
          const IconCmp = ICON_MAP[key] || ICON_MAP.dots;
          const sel = value === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onChange(key)}
              aria-label={`Icon ${key}`}
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                flexShrink: 0,
                border: 'none',
                cursor: 'pointer',
                background: sel ? activeTint : '#F4F5F7',
                color: sel ? '#fff' : '#0F0F12',
                display: 'grid',
                placeItems: 'center',
                boxShadow: sel ? `0 2px 8px -2px ${activeTint}88` : 'none',
                fontFamily: 'inherit',
              }}
            >
              <IconCmp size={18} stroke={2.1} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
