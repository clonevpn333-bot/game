import { ViewTransition, type ReactNode } from 'react';

/** Docs pages crossfade inside the persistent sidebar layout. */
export default function DocsTemplate({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      <article className="max-w-[72ch]">{children}</article>
    </ViewTransition>
  );
}
