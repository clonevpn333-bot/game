import type { ReactNode } from 'react';
import { Rails } from './rails';

export function PageHeader({
  eyebrow,
  title,
  lede,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  lede?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-70" aria-hidden />
      <Rails className="relative">
        <div className="px-5 pb-14 pt-16 md:px-10 md:pb-20 md:pt-24">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-5 max-w-[18ch] text-[2.5rem] font-semibold leading-[1.04] tracking-[-0.04em] text-balance md:text-[3.75rem]">
            {title}
          </h1>
          {lede ? (
            <p className="mt-5 max-w-[60ch] text-body text-pretty text-fg-muted md:text-[17px]">
              {lede}
            </p>
          ) : null}
          {children}
        </div>
      </Rails>
    </section>
  );
}
