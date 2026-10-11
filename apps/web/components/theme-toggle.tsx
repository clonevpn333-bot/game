'use client';

import { ThemeSwitcher } from '@binderready/design';
import { themeStore } from '@/lib/theme';

export function ThemeToggle({ className }: { className?: string }) {
  return <ThemeSwitcher store={themeStore} {...(className ? { className } : {})} />;
}
