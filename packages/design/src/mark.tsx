import type { CSSProperties, ComponentProps } from 'react';

const BARS = [
  { y: 4.5, width: 11, from: 0.36 },
  { y: 8.75, width: 7.5, from: 1.2 },
  { y: 13, width: 4, from: 2.75 },
] as const;

/**
 * The BinderReady mark: a crisp tile holding three square-cut bars in descending order,
 * a sorted index. Sized by font-size (1em square). Hovering the mark, or a link or button
 * around it, briefly shuffles the bars out of order and snaps them back: sorted
 * (preset.css `.mark-bar`; still under reduced motion).
 */
export function Mark({ className, ...props }: Omit<ComponentProps<'svg'>, 'children'>) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="1em"
      height="1em"
      aria-hidden="true"
      focusable="false"
      className={className ? `mark ${className}` : 'mark'}
      {...props}
    >
      <rect width="20" height="20" rx="2" fill="var(--fg)" />
      {BARS.map((bar, i) => (
        <rect
          key={bar.y}
          className="mark-bar"
          x="4.5"
          y={bar.y}
          width={bar.width}
          height="2.5"
          fill="var(--bg)"
          style={{ '--i': i, '--from': bar.from } as CSSProperties}
        />
      ))}
    </svg>
  );
}
