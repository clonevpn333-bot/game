'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cx } from './cx';
import type { ThemePreference, ThemeStore } from './theme';
import { useTheme } from './use-theme';

const options: { value: ThemePreference; label: string; icon: ReactNode }[] = [
  { value: 'system', label: 'System', icon: <Monitor strokeWidth={1.5} /> },
  { value: 'light', label: 'Light', icon: <Sun strokeWidth={1.5} /> },
  { value: 'dark', label: 'Dark', icon: <Moon strokeWidth={1.5} /> },
];

/** Three-way theme control built on native radios, so arrow keys and screen readers just work. */
export function ThemeSwitcher({ store, className }: { store: ThemeStore; className?: string }) {
  const { preference } = useTheme(store);
  const name = useId();
  return (
    <fieldset className={cx('flex w-fit rounded-full border border-border p-0.5', className)}>
      <legend className="sr-only">Theme</legend>
      {options.map((option) => (
        <label
          key={option.value}
          title={option.label}
          className={cx(
            'relative grid size-7 cursor-pointer place-items-center rounded-full text-fg-subtle transition-colors duration-150',
            'hover:text-fg has-checked:bg-fg/8 has-checked:text-fg',
            'has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus',
            '[&_svg]:size-4',
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={preference === option.value}
            onChange={() => {
              store.setPreference(option.value);
            }}
            className="sr-only"
          />
          {option.icon}
          <span className="sr-only">{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
