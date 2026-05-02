import type { TabId } from '@/features/shell/types/navigation';

const PATH_TO_TAB: Record<string, TabId> = {
  '/': 'home',
  '/home': 'home',
  '/stats': 'stats',
  '/history': 'history',
  '/profile': 'profile',
  '/categories': 'categories',
};

const TAB_TO_PATH: Record<TabId, string> = {
  home: '/',
  stats: '/stats',
  history: '/history',
  profile: '/profile',
  categories: '/categories',
};

function normalizePathname(pathname: string): string {
  if (pathname.length > 1 && pathname.endsWith('/')) return pathname.slice(0, -1);
  return pathname;
}

/** Map current URL path to a tab; unknown paths fall back to home. */
export function tabFromPathname(pathname: string): TabId {
  return PATH_TO_TAB[normalizePathname(pathname)] ?? 'home';
}

/** Canonical path for a tab (used in history and links). */
export function pathnameForTab(tab: TabId): string {
  return TAB_TO_PATH[tab];
}

/** True when pathname is not the canonical path for its resolved tab (e.g. `/home` vs `/`). */
export function shouldReplacePathname(pathname: string, tab: TabId): boolean {
  return normalizePathname(pathname) !== pathnameForTab(tab);
}
