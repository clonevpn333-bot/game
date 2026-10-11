import { createThemeStore } from '@binderready/design';

/** Desktop theme: follows the OS until the user picks one (Settings → Appearance). */
export const themeStore = createThemeStore({ storageKey: 'br-desktop-theme', fallback: 'system' });
