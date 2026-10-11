import { Kbd, StatusDot, cx } from '@binderready/design';
import { BookCopy, FolderOpen, Plus, Settings, Users } from 'lucide-react';
import { ask } from '@tauri-apps/plugin-dialog';
import { useState, type ReactNode } from 'react';
import { backend } from '../lib/backend';
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
      <UpdateNotice />
      <LicensePill />
      <button
        type="button"
        onClick={() => {
          set({ paletteOpen: true });
        }}
        className="mt-2 flex h-8 items-center justify-between rounded-control border border-border px-2.5 text-xs text-fg-muted hover:text-fg"
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

/** License status at the bottom of the sidebar; opens Settings → License. */
function LicensePill() {
  const license = useApp((s) => s.license);
  const go = useApp((s) => s.go);
  const update = useApp((s) => s.update);
  if (!license) return <div className="mt-auto" />;
  const left = Math.max(0, license.trialLimit - license.trialUsed);
  const label = license.licensed
    ? `Licensed${license.variantName ? ` · ${license.variantName}` : ''}`
    : left
      ? `Trial · ${String(left)} of ${String(license.trialLimit)} binders left`
      : 'Trial used · Activate a license';
  return (
    <button
      type="button"
      onClick={() => {
        go('settings');
        requestAnimationFrame(() => {
          document.getElementById('license')?.scrollIntoView({ block: 'start' });
        });
      }}
      className={cx(
        'flex h-8 items-center gap-2 rounded-control px-2.5 text-left text-xs text-fg-muted hover:bg-bg hover:text-fg',
        !update && 'mt-auto',
      )}
    >
      <StatusDot tone={license.licensed ? 'success' : left ? 'neutral' : 'warning'} />
      <span className="truncate">{label}</span>
    </button>
  );
}

/** Shown when the update check found a newer signed version. */
function UpdateNotice() {
  const update = useApp((s) => s.update);
  const [state, setState] = useState<'idle' | 'installing' | 'failed'>('idle');
  if (!update) return null;
  const install = async () => {
    const ok = await ask(
      `Version ${update.version} will download, install and restart the app. Unsaved review work in the open binder will be lost.`,
      {
        title: 'Install the update?',
        kind: 'info',
        okLabel: 'Install and restart',
        cancelLabel: 'Later',
      },
    );
    if (!ok) return;
    setState('installing');
    try {
      await backend.installUpdate();
    } catch {
      setState('failed');
    }
  };
  return (
    <button
      type="button"
      disabled={state === 'installing'}
      onClick={() => void install()}
      className="mt-auto mb-1 flex h-8 items-center gap-2 rounded-control border border-border px-2.5 text-left text-xs hover:border-border-strong"
    >
      <StatusDot tone={state === 'failed' ? 'danger' : 'success'} />
      <span className="truncate">
        {state === 'installing'
          ? 'Installing update…'
          : state === 'failed'
            ? 'Update failed · Try again'
            : `Update ${update.version} available`}
      </span>
    </button>
  );
}
