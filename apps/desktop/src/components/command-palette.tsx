import { Kbd, cx } from '@binderready/design';
import { ask } from '@tauri-apps/plugin-dialog';
import { BookCopy, FileDown, Moon, Plus, Settings, Users, X } from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { themeStore } from '../lib/theme';
import { modKey } from '../lib/platform';
import { useApp } from '../state/store';

interface Command {
  id: string;
  label: string;
  hint?: string;
  icon: ReactNode;
  run: () => void;
}

/** ⌘K / Ctrl+K: new binder, open client, export, toggle theme, open settings. */
/** Closing loses review edits unless the binder was exported: ask first. */
async function confirmClose(): Promise<boolean> {
  const { lastExport, docs } = useApp.getState();
  if (lastExport || docs.length === 0) return true;
  return ask('This binder hasn’t been exported. Close it and discard the review?', {
    title: 'Close binder',
    kind: 'warning',
    okLabel: 'Close binder',
    cancelLabel: 'Keep reviewing',
  });
}

export function CommandPalette() {
  const open = useApp((s) => s.paletteOpen);
  const set = useApp((s) => s.set);
  const go = useApp((s) => s.go);
  const clients = useApp((s) => s.clients);
  const batch = useApp((s) => s.batch);
  const docs = useApp((s) => s.docs);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        set({ paletteOpen: !useApp.getState().paletteOpen });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [set]);

  // Start fresh each time the palette opens.
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setQuery('');
      setActive(0);
    }
  }
  useEffect(() => {
    if (open) requestAnimationFrame(() => input.current?.focus());
  }, [open]);

  const commands = useMemo<Command[]>(() => {
    const list: Command[] = [
      {
        id: 'new',
        label: batch ? 'Go to current binder' : 'New binder',
        icon: <Plus strokeWidth={1.5} />,
        run: () => {
          go(batch ? (batch.finishedAt ? 'review' : 'processing') : 'new-binder');
        },
      },
    ];
    if (batch?.finishedAt && docs.some((d) => !d.excluded)) {
      list.push({
        id: 'export',
        label: 'Export binder',
        hint: `${modKey} E`,
        icon: <FileDown strokeWidth={1.5} />,
        run: () => {
          go('review');
          useApp.getState().openExport();
        },
      });
    }
    if (batch) {
      list.push({
        id: 'close',
        label: 'Close binder',
        icon: <X strokeWidth={1.5} />,
        run: () => {
          void confirmClose().then((ok) => {
            if (ok) useApp.getState().closeBinder();
          });
        },
      });
    }
    list.push(
      {
        id: 'clients',
        label: 'Clients',
        icon: <Users strokeWidth={1.5} />,
        run: () => {
          go('clients');
        },
      },
      {
        id: 'recent',
        label: 'Recent binders',
        icon: <BookCopy strokeWidth={1.5} />,
        run: () => {
          go('recent');
        },
      },
      {
        id: 'theme',
        label: 'Toggle theme',
        hint: themeStore.resolve() === 'dark' ? 'Switch to light' : 'Switch to dark',
        icon: <Moon strokeWidth={1.5} />,
        run: () => {
          themeStore.setPreference(themeStore.resolve() === 'dark' ? 'light' : 'dark');
        },
      },
      {
        id: 'settings',
        label: 'Open settings',
        icon: <Settings strokeWidth={1.5} />,
        run: () => {
          go('settings');
        },
      },
    );
    if (!batch) {
      for (const c of clients) {
        list.push({
          id: `client-${String(c.id)}`,
          label: `Open client: ${c.displayName}`,
          hint: c.lastYear ? `Last binder ${String(c.lastYear)}` : 'No binders yet',
          icon: <Users strokeWidth={1.5} />,
          run: () => {
            useApp.setState({ view: 'new-binder' });
            window.dispatchEvent(new CustomEvent('binderready:pick-client', { detail: c.id }));
          },
        });
      }
    }
    return list;
  }, [batch, clients, docs, go]);

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase().trim()),
  );
  if (!open) return null;

  const run = (c: Command | undefined) => {
    if (!c) return;
    set({ paletteOpen: false });
    c.run();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-overlay pt-[14vh]"
      onMouseDown={() => {
        set({ paletteOpen: false });
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onMouseDown={(e) => {
          e.stopPropagation();
        }}
        className="w-[560px] overflow-hidden rounded-panel border border-border-strong bg-surface shadow-[0_40px_120px_-30px_rgb(0_0_0/0.6)]"
      >
        <input
          ref={input}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setActive((a) => Math.min(filtered.length - 1, a + 1));
            }
            if (e.key === 'ArrowUp') {
              e.preventDefault();
              setActive((a) => Math.max(0, a - 1));
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              run(filtered[active]);
            }
            if (e.key === 'Escape') {
              set({ paletteOpen: false });
            }
          }}
          placeholder="Type a command or a client name"
          aria-controls="palette-list"
          className="h-12 w-full border-b border-border bg-transparent px-4 text-[15px] outline-none placeholder:text-fg-subtle"
        />
        <ul id="palette-list" role="listbox" className="max-h-80 overflow-y-auto p-1.5">
          {filtered.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-fg-muted">No matching commands</li>
          ) : null}
          {filtered.map((c, i) => (
            <li
              key={c.id}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => {
                setActive(i);
              }}
              onClick={() => {
                run(c);
              }}
              className={cx(
                'flex h-10 cursor-pointer items-center gap-3 rounded-control px-3 text-sm [&_svg]:size-4 [&_svg]:text-fg-muted',
                i === active && 'bg-fg/8',
              )}
            >
              {c.icon}
              <span className="flex-1 truncate">{c.label}</span>
              {c.hint ? <span className="text-xs text-fg-subtle">{c.hint}</span> : null}
            </li>
          ))}
        </ul>
        <div className="flex items-center gap-3 border-t border-border px-4 py-2 text-xs text-fg-subtle">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> move
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Enter</Kbd> run
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Esc</Kbd> close
          </span>
        </div>
      </div>
    </div>
  );
}
