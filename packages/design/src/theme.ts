export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

export interface ThemeStoreOptions {
  /** localStorage key that holds an explicit choice. */
  storageKey: string;
  /** Preference used when nothing is stored. */
  fallback: ThemePreference;
}

export interface ThemeStore {
  subscribe: (listener: () => void) => () => void;
  getPreference: () => ThemePreference;
  setPreference: (next: ThemePreference) => void;
  resolve: () => ResolvedTheme;
  options: ThemeStoreOptions;
}

function isPreference(value: unknown): value is ThemePreference {
  return value === 'system' || value === 'light' || value === 'dark';
}

/** Applies a preference to <html>. "system" removes the attribute so the OS decides. */
export function applyThemePreference(preference: ThemePreference) {
  const root = document.documentElement;
  if (preference === 'system') delete root.dataset.theme;
  else root.dataset.theme = preference;
}

/**
 * Inline script for <head> that applies the stored theme before first paint.
 * Keep in sync with createThemeStore's storage format.
 */
export function themeBootScript({ storageKey, fallback }: ThemeStoreOptions): string {
  return `(function(){var p=${JSON.stringify(fallback)};try{var s=localStorage.getItem(${JSON.stringify(storageKey)});if(s==='system'||s==='light'||s==='dark')p=s}catch(e){}var r=document.documentElement;if(p==='system')delete r.dataset.theme;else r.dataset.theme=p})();`;
}

/** A theme preference store backed by localStorage. Safe to create during SSR. */
export function createThemeStore(options: ThemeStoreOptions): ThemeStore {
  const listeners = new Set<() => void>();
  let preference: ThemePreference | null = null;
  let media: MediaQueryList | null = null;

  const emit = () => {
    for (const listener of listeners) listener();
  };

  const getPreference = (): ThemePreference => {
    if (preference) return preference;
    if (typeof window === 'undefined') return options.fallback;
    try {
      const stored = localStorage.getItem(options.storageKey);
      preference = isPreference(stored) ? stored : options.fallback;
    } catch {
      preference = options.fallback;
    }
    return preference;
  };

  return {
    options,
    getPreference,
    subscribe(listener) {
      listeners.add(listener);
      if (!media && typeof window !== 'undefined') {
        media = window.matchMedia('(prefers-color-scheme: dark)');
        media.addEventListener('change', emit);
      }
      return () => listeners.delete(listener);
    },
    setPreference(next) {
      preference = next;
      applyThemePreference(next);
      try {
        localStorage.setItem(options.storageKey, next);
      } catch {
        // Storage can be unavailable (private mode); the choice still applies for this visit.
      }
      emit();
    },
    resolve() {
      const pref = getPreference();
      if (pref !== 'system') return pref;
      if (typeof window === 'undefined') return 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },
  };
}
