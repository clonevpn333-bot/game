import { useSyncExternalStore } from 'react';

export type ThemePreference = 'system' | 'light' | 'dark';

const STORAGE_KEY = 'steel-theme';
const listeners = new Set<() => void>();
const media = window.matchMedia('(prefers-color-scheme: dark)');

function readStored(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    return 'system';
  }
}

let preference = readStored();

function emit() {
  for (const listener of listeners) listener();
}

media.addEventListener('change', emit);

export function setThemePreference(next: ThemePreference) {
  preference = next;
  const root = document.documentElement;
  if (next === 'system') delete root.dataset.theme;
  else root.dataset.theme = next;
  try {
    if (next === 'system') localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage can be unavailable (private mode); the choice still applies for this visit.
  }
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function snapshot(): string {
  const resolved = preference === 'system' ? (media.matches ? 'dark' : 'light') : preference;
  return `${preference}:${resolved}`;
}

/** Current preference and the theme it resolves to. */
export function useTheme() {
  const [pref, resolved] = useSyncExternalStore(subscribe, snapshot).split(':') as [
    ThemePreference,
    'light' | 'dark',
  ];
  return { preference: pref, resolved };
}
