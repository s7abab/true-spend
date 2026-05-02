import type { TabId } from '@/features/shell/types/navigation';

const PATH_TO_TAB: Record<string, TabId> = {
  '/': 'home',
  '/home': 'home',
  '/stats': 'stats',
  '/history': 'history',
  '/profile': 'profile',
  '/profile/categories': 'profile',
};

const TAB_TO_PATH: Record<TabId, string> = {
  home: '/',
  stats: '/stats',
  history: '/history',
  profile: '/profile',
};

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}

/** Map current URL path to a primary tab (profile covers /profile/categories). */
export function tabFromPathname(pathname: string): TabId {
  const n = normalizePathname(pathname);
  return PATH_TO_TAB[n] ?? 'home';
}

/** Canonical path for a primary tab. */
export function pathnameForTab(tab: TabId): string {
  return TAB_TO_PATH[tab];
}

/** True when pathname should be replaced with the canonical tab URL (e.g. `/home` → `/`). */
export function shouldReplacePathname(pathname: string, tab: TabId): boolean {
  const n = normalizePathname(pathname);
  if (n.startsWith('/profile/')) return false;
  return n !== pathnameForTab(tab);
}
