'use client';

import { useSyncExternalStore } from 'react';
import type { ResolvedTheme, ThemePreference, ThemeStore } from './theme';

/** Current preference and the theme it resolves to. */
export function useTheme(store: ThemeStore) {
  const snapshot = useSyncExternalStore(
    store.subscribe,
    () => `${store.getPreference()}:${store.resolve()}`,
    () => `${store.options.fallback}:${store.options.fallback === 'light' ? 'light' : 'dark'}`,
  );
  const [preference, resolved] = snapshot.split(':') as [ThemePreference, ResolvedTheme];
  return { preference, resolved };
}
