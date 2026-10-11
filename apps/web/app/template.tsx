import { ViewTransition, type ReactNode } from 'react';

/** Remounts on every navigation, so route changes get a quiet crossfade. */
export default function Template({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="page-in" exit="page-out" default="none">
      <div>{children}</div>
    </ViewTransition>
  );
}
