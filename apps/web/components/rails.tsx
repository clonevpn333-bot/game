import { Crosshair, cx } from '@binderready/design';
import type { ComponentProps, ReactNode } from 'react';

/** The page column: hairline rails left and right, 16px gutter on phones. */
export function Rails({ className, children, ...props }: ComponentProps<'div'>) {
  return (
    <div className="px-4 md:px-8">
      <div className={cx('mx-auto max-w-[1200px] border-x border-border', className)} {...props}>
        {children}
      </div>
    </div>
  );
}

/** A full-bleed hairline with crosshairs where it meets the rails. */
export function Band({
  className,
  children,
  id,
  labelledBy,
}: {
  className?: string;
  children: ReactNode;
  id?: string;
  labelledBy?: string;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className="border-t border-border">
      <Rails className={cx('relative', className)}>
        <Crosshair corner="top-left" />
        <Crosshair corner="top-right" />
        {children}
      </Rails>
    </section>
  );
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  lede,
  className,
}: {
  id: string;
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('max-w-2xl', className)}>
      <p className="eyebrow">{eyebrow}</p>
      <h2 id={id} className="mt-4 text-h2 text-balance">
        {title}
      </h2>
      {lede ? <p className="mt-4 text-body text-pretty text-fg-muted">{lede}</p> : null}
    </div>
  );
}
