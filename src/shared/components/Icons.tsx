import type { CSSProperties, ReactElement, ReactNode } from 'react';

type IconBaseProps = {
  size?: number;
  stroke?: number;
  fill?: string;
  children?: ReactNode;
  style?: CSSProperties;
};

const Icon = ({
  size = 22,
  stroke = 2,
  fill = 'none',
  children,
  style = {},
}: IconBaseProps) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={fill}
    stroke="currentColor"
    strokeWidth={stroke}
    strokeLinecap="round"
    strokeLinejoin="round"
    style={{ display: 'block', flexShrink: 0, ...style }}
  >
    {children}
  </svg>
);

export const IHome = (p: IconBaseProps) => (
  <Icon {...p}>
    <path d="M3 11l9-8 9 8" />
    <path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" />
  </Icon>
);
export const IChart = (p: IconBaseProps) => (
  <Icon {...p}>
    <path d="M3 3v18h18" />
    <path d="M7 14l4-4 4 3 5-7" />
  </Icon>
);
export const IList = (p: IconBaseProps) => (
  <Icon {...p}>
    <path d="M8 6h13" />
    <path d="M8 12h13" />
    <path d="M8 18h13" />
    <circle cx="3.5" cy="6" r="1" />
    <circle cx="3.5" cy="12" r="1" />
    <circle cx="3.5" cy="18" r="1" />
  </Icon>
);
export const IUser = (p: IconBaseProps) => (
  <Icon {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8" />
  </Icon>
);
export const IPlus = (p: IconBaseProps) => (
  <Icon {...p}>
    <path d="M12 5v14" />
    <path d="M5 12h14" />
  </Icon>
);
export const IArrowDown = (p: IconBaseProps) => (
  <Icon {...p}>
    <path d="M12 5v14" />
    <path d="M19 12l-7 7-7-7" />
  </Icon>
);
export const IArrowUp = (p: IconBaseProps) => (
  <Icon {...p}>
    <path d="M12 19V5" />
    <path d="M5 12l7-7 7 7" />
  </Icon>
);
export const IClose = (p: IconBaseProps) => (
  <Icon {...p}>
    <path d="M6 6l12 12" />
    <path d="M18 6L6 18" />
  </Icon>
);
export const IBell = (p: IconBaseProps) => (
  <Icon {...p}>
    <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
    <path d="M10 21a2 2 0 0 0 4 0" />
  </Icon>
);
export const ISearch = (p: IconBaseProps) => (
  <Icon {...p}>
    <circle cx="11" cy="11" r="7" />
    <path d="M21 21l-4.3-4.3" />
  </Icon>
);
export const ICheck = (p: IconBaseProps) => (
  <Icon {...p}>
    <path d="M20 6L9 17l-5-5" />
  </Icon>
);
export const ISparkle = (p: IconBaseProps) => (
  <Icon {...p}>
    <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" />
  </Icon>
);
export const ICalendar = (p: IconBaseProps) => (
  <Icon {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M8 3v4" />
    <path d="M16 3v4" />
    <path d="M3 10h18" />
  </Icon>
);
export const IChevDown = (p: IconBaseProps) => (
  <Icon {...p}>
    <path d="M6 9l6 6 6-6" />
  </Icon>
);
export const IChevLeft = (p: IconBaseProps) => (
  <Icon {...p}>
    <path d="M15 6l-6 6 6 6" />
  </Icon>
);
export const IChevRight = (p: IconBaseProps) => (
  <Icon {...p}>
    <path d="M9 6l6 6-6 6" />
  </Icon>
);
export const ICTrend = (p: IconBaseProps) => (
  <Icon {...p}>
    <path d="M3 17l6-6 4 4 8-9" />
    <path d="M14 6h7v7" />
  </Icon>
);
export const ISettings = (p: IconBaseProps) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Icon>
);
export const IFilter = (p: IconBaseProps) => (
  <Icon {...p}>
    <path d="M3 5h18" />
    <path d="M6 12h12" />
    <path d="M10 19h4" />
  </Icon>
);
export const ITag = (p: IconBaseProps) => (
  <Icon {...p}>
    <path d="M12 2H4a2 2 0 0 0-2 2v8a2 2 0 0 0 .59 1.41L11 20.91a2 2 0 0 0 2.82 0l8.59-8.59A2 2 0 0 0 20 10V4a2 2 0 0 0-2-2h-6z" />
    <circle cx="9" cy="6" r="1.2" />
  </Icon>
);
export const IDownload = (p: IconBaseProps) => (
  <Icon {...p}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </Icon>
);
export const ITrash = (p: IconBaseProps) => (
  <Icon {...p}>
    <path d="M3 6h18" />
    <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    <line x1="10" y1="11" x2="10" y2="17" />
    <line x1="14" y1="11" x2="14" y2="17" />
  </Icon>
);

export const ICON_MAP: Record<string, (p: IconBaseProps) => ReactElement> = {
  coffee: (p) => (
    <Icon {...p}>
      <path d="M3 8h14a3 3 0 0 1 0 6h-1" />
      <path d="M3 8v6a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4V8z" />
      <path d="M7 2v3" />
      <path d="M11 2v3" />
    </Icon>
  ),
  cart: (p) => (
    <Icon {...p}>
      <circle cx="9" cy="20" r="1.5" />
      <circle cx="18" cy="20" r="1.5" />
      <path d="M2 3h3l3 12h12l2-8H6" />
    </Icon>
  ),
  car: (p) => (
    <Icon {...p}>
      <path d="M5 17h14" />
      <path d="M5 17l-2-6 3-5h12l3 5-2 6" />
      <circle cx="7.5" cy="17" r="1.5" />
      <circle cx="16.5" cy="17" r="1.5" />
    </Icon>
  ),
  film: (p) => (
    <Icon {...p}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18" />
      <path d="M9 4v16" />
      <path d="M15 4v16" />
    </Icon>
  ),
  home2: (p) => (
    <Icon {...p}>
      <path d="M3 11l9-8 9 8" />
      <path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" />
    </Icon>
  ),
  zap: (p) => (
    <Icon {...p}>
      <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
    </Icon>
  ),
  heart: (p) => (
    <Icon {...p}>
      <path d="M12 21s-7-4.5-9.5-9A5.5 5.5 0 0 1 12 6a5.5 5.5 0 0 1 9.5 6c-2.5 4.5-9.5 9-9.5 9z" />
    </Icon>
  ),
  gift: (p) => (
    <Icon {...p}>
      <rect x="3" y="8" width="18" height="13" rx="1" />
      <path d="M3 13h18" />
      <path d="M12 8v13" />
      <path d="M12 8c-2 0-4-1-4-3s2-3 4 0c2-3 4-2 4 0s-2 3-4 3z" />
    </Icon>
  ),
  book: (p) => (
    <Icon {...p}>
      <path d="M4 4h12a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z" />
      <path d="M4 4v15" />
    </Icon>
  ),
  briefcase: (p) => (
    <Icon {...p}>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M9 7V5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" />
      <path d="M3 13h18" />
    </Icon>
  ),
  trend: (p) => (
    <Icon {...p}>
      <path d="M3 17l6-6 4 4 8-9" />
      <path d="M14 6h7v7" />
    </Icon>
  ),
  dots: (p) => (
    <Icon {...p}>
      <circle cx="6" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="18" cy="12" r="1.5" />
    </Icon>
  ),
};

type CatIconProps = {
  cat: { icon: string; tint: string };
  size?: number;
  radius?: number;
};

export function CatIcon({ cat, size = 36, radius = 10 }: CatIconProps) {
  const IconCmp = ICON_MAP[cat.icon] ?? ICON_MAP.dots;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `${cat.tint}18`,
        color: cat.tint,
        display: 'grid',
        placeItems: 'center',
        flexShrink: 0,
      }}
    >
      <IconCmp size={size * 0.46} stroke={2} />
    </div>
  );
}
