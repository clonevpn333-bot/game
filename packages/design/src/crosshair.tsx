import type { ComponentProps } from 'react';
import { cx } from './cx';

/**
 * A "+" registration mark for grid intersections. Centered on the
 * containing block's corner via the `corner` prop; the parent must be positioned.
 */
export type CrosshairCorner = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const corners: Record<CrosshairCorner, string> = {
  'top-left': '-left-[6px] -top-[6px]',
  'top-right': '-right-[6px] -top-[6px]',
  'bottom-left': '-bottom-[6px] -left-[6px]',
  'bottom-right': '-bottom-[6px] -right-[6px]',
};

export function Crosshair({
  corner,
  className,
  ...props
}: Omit<ComponentProps<'svg'>, 'children'> & { corner: CrosshairCorner }) {
  return (
    <svg
      viewBox="0 0 11 11"
      width="11"
      height="11"
      aria-hidden="true"
      focusable="false"
      className={cx('pointer-events-none absolute z-10 text-fg-subtle', corners[corner], className)}
      {...props}
    >
      <path d="M5.5 0v11M0 5.5h11" stroke="currentColor" strokeWidth="1" />
    </svg>
  );
}
