import type { ComponentProps } from 'react';
import { cx } from './cx';

export function Kbd({ className, ...props }: ComponentProps<'kbd'>) {
  return (
    <kbd
      className={cx(
        'inline-flex h-5 min-w-5 items-center justify-center rounded-[4px] border border-border-strong bg-bg-subtle px-1',
        'font-mono text-[11px] font-medium leading-none text-fg-muted shadow-[inset_0_-1px_0_var(--border-strong)]',
        className,
      )}
      {...props}
    />
  );
}
