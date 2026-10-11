import { Kbd, cx } from '@binderready/design';
import { BookCopy, FolderOpen, Plus, Settings, Users } from 'lucide-react';
import type { ReactNode } from 'react';
import { modKey } from '../lib/platform';
import { useApp, type View } from '../state/store';

function Item({
  view,
  icon,
  label,
  active,
}: {
  view: View;
  icon: ReactNode;
  label: string;
  active: boolean;
}) {
  const go = useApp((s) => s.go);
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      onClick={() => {
        go(view);
      }}
      className={cx(
        'flex h-8 w-full items-center gap-2.5 rounded-control px-2.5 text-[13px] transition-colors duration-150 [&_svg]:size-4',
        active ? 'bg-fg/8 text-fg' : 'text-fg-muted hover:bg-fg/5 hover:text-fg',
      )}
    >
      {icon}
      {label}
    </button>
  );
}

export function Sidebar() {
  const view = useApp((s) => s.view);
  const batch = useApp((s) => s.batch);
  const go = useApp((s) => s.go);
  const set = useApp((s) => s.set);
  const inBinder = view === 'processing' || view === 'review';
  return (
    <nav
      aria-label="Main"
      className="flex w-60 shrink-0 flex-col border-r border-border bg-bg-subtle px-3 py-3"
    >
      <button
        type="button"
        onClick={() => {
          go(batch ? (batch.finishedAt ? 'review' : 'processing') : 'new-binder');
        }}
        className="flex h-9 items-center gap-2 rounded-control bg-fg px-3 text-[13px] font-medium text-bg transition-colors duration-150 hover:bg-fg/85 [&_svg]:size-4"
      >
        {batch ? <FolderOpen strokeWidth={1.5} /> : <Plus strokeWidth={1.5} />}
        {batch ? 'Current binder' : 'New binder'}
      </button>
      <div className="mt-4 space-y-0.5">
        {batch ? (
          <Item
            view={batch.finishedAt ? 'review' : 'processing'}
            icon={<FolderOpen strokeWidth={1.5} />}
            label={batch.client.displayName}
            active={inBinder}
          />
        ) : null}
        <Item
          view="clients"
          icon={<Users strokeWidth={1.5} />}
          label="Clients"
          active={view === 'clients'}
        />
        <Item
          view="recent"
          icon={<BookCopy strokeWidth={1.5} />}
          label="Recent binders"
          active={view === 'recent'}
        />
        <Item
          view="settings"
          icon={<Settings strokeWidth={1.5} />}
          label="Settings"
          active={view === 'settings'}
        />
      </div>
      <button
        type="button"
        onClick={() => {
          set({ paletteOpen: true });
        }}
        className="mt-auto flex h-8 items-center justify-between rounded-control border border-border px-2.5 text-xs text-fg-muted hover:text-fg"
      >
        Commands
        <span className="flex gap-1">
          <Kbd>{modKey}</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>
    </nav>
  );
}
