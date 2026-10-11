import type { ComponentProps } from 'react';
import { cx } from './cx';

export type Tone = 'neutral' | 'success' | 'warning' | 'danger';

const badgeTones: Record<Tone, string> = {
  neutral: 'border-border-strong text-fg-muted',
  success: 'border-success/35 bg-success/8 text-success',
  warning: 'border-warning/35 bg-warning/8 text-warning',
  danger: 'border-danger/35 bg-danger/8 text-danger',
};

export type BadgeProps = ComponentProps<'span'> & { tone?: Tone };

export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-full border px-2 text-xs font-medium',
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  );
}

const dotTones: Record<Tone, string> = {
  neutral: 'bg-fg-subtle',
  success: 'bg-success',
  warning: 'bg-warning',
  danger: 'bg-danger',
};

export type StatusDotProps = Omit<ComponentProps<'span'>, 'children'> & {
  tone?: Tone;
  /** Announced to screen readers. Omit only when adjacent text already says the same thing. */
  label?: string;
};

/** Small colored dot for status that is otherwise quiet, e.g. a "Check" confidence marker. */
export function StatusDot({ tone = 'neutral', label, className, ...props }: StatusDotProps) {
  return (
    <span className={cx('inline-flex items-center', className)} {...props}>
      <span aria-hidden="true" className={cx('size-1.5 rounded-full', dotTones[tone])} />
      {label ? <span className="sr-only">{label}</span> : null}
    </span>
  );
}
