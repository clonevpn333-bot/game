import type { ReactNode } from 'react';
import { DocsSidebar } from '@/components/docs-sidebar';
import { Rails } from '@/components/rails';

export default function DocsLayout({ children }: { children: ReactNode }) {
  return (
    <Rails>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-8 px-5 pb-24 pt-10 md:px-10 lg:grid-cols-[220px_minmax(0,1fr)] lg:gap-14 lg:pt-16">
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <DocsSidebar />
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </Rails>
  );
}
