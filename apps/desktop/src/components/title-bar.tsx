import { Mark } from '@binderready/design';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { Minus, Square, X } from 'lucide-react';
import { isMac } from '../lib/platform';
import { useApp } from '../state/store';

function WindowButton({
  label,
  onClick,
  children,
  danger,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={`grid h-10 w-11 place-items-center text-fg-muted transition-colors duration-150 hover:text-fg ${danger ? 'hover:bg-danger hover:text-white' : 'hover:bg-fg/8'} [&_svg]:size-3.5`}
    >
      {children}
    </button>
  );
}

export function TitleBar() {
  const batch = useApp((s) => s.batch);
  const win = getCurrentWindow();
  return (
    <header
      data-tauri-drag-region
      className="flex h-10 shrink-0 items-center border-b border-border bg-bg-subtle"
    >
      <div data-tauri-drag-region className={`flex items-center gap-2 ${isMac ? 'pl-20' : 'pl-4'}`}>
        <Mark className="text-[15px]" />
        <span data-tauri-drag-region className="text-[13px] font-semibold tracking-[-0.01em]">
          BinderReady
        </span>
      </div>
      <p
        data-tauri-drag-region
        className="min-w-0 flex-1 truncate text-center text-xs text-fg-muted"
      >
        {batch ? `${batch.client.displayName} · ${String(batch.taxYear)}` : ''}
      </p>
      {isMac ? (
        <div className="w-20" />
      ) : (
        <div className="flex">
          <WindowButton label="Minimize" onClick={() => void win.minimize()}>
            <Minus strokeWidth={1.5} />
          </WindowButton>
          <WindowButton label="Maximize" onClick={() => void win.toggleMaximize()}>
            <Square strokeWidth={1.5} />
          </WindowButton>
          <WindowButton label="Close" danger onClick={() => void win.close()}>
            <X strokeWidth={1.5} />
          </WindowButton>
        </div>
      )}
    </header>
  );
}
