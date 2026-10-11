import type { ComponentProps } from 'react';

/**
 * The BinderReady mark: a solid tile holding three bars in descending order,
 * a sorted index. Original geometry; sized by font-size (1em square).
 */
export function Mark({ className, ...props }: Omit<ComponentProps<'svg'>, 'children'>) {
  return (
    <svg
      viewBox="0 0 20 20"
      width="1em"
      height="1em"
      aria-hidden="true"
      focusable="false"
      className={className}
      {...props}
    >
      <rect width="20" height="20" rx="5" fill="var(--fg)" />
      <rect x="5" y="5" width="10" height="2" rx="1" fill="var(--bg)" />
      <rect x="5" y="9" width="7" height="2" rx="1" fill="var(--bg)" />
      <rect x="5" y="13" width="4" height="2" rx="1" fill="var(--bg)" />
    </svg>
  );
}
