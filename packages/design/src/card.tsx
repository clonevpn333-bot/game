import type { ComponentProps } from 'react';
import { cx } from './cx';

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cx('flex flex-col rounded-card border border-border bg-surface', className)}
      {...props}
    />
  );
}

export function CardHeader({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cx('flex flex-col gap-1 px-5 pt-5', className)} {...props} />;
}

export function CardTitle({ className, ...props }: ComponentProps<'h3'>) {
  return (
    <h3
      className={cx('text-[15px] font-semibold leading-snug tracking-[-0.01em]', className)}
      {...props}
    />
  );
}

export function CardDescription({ className, ...props }: ComponentProps<'p'>) {
  return <p className={cx('text-sm text-fg-muted', className)} {...props} />;
}

export function CardBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cx('px-5 py-4', className)} {...props} />;
}

export function CardFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cx(
        'mt-auto flex items-center gap-2 rounded-b-card border-t border-border bg-bg-subtle px-5 py-3',
        className,
      )}
      {...props}
    />
  );
}
