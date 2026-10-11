import { Button, Card, CardBody, CardHeader, CardTitle, cx } from '@binderready/design';
import { useEffect, useId, useState } from 'react';
import type { Client } from '../lib/backend';
import { useApp } from '../state/store';
import { DropZone } from './drop-zone';

const thisYear = new Date().getFullYear();
/** Preparers work on the prior tax year for most of the season. */
const defaultYear = new Date().getMonth() < 10 ? thisYear - 1 : thisYear;

export function NewBinder() {
  const clients = useApp((s) => s.clients);
  const pending = useApp((s) => s.pendingPaths);
  const queuePaths = useApp((s) => s.queuePaths);
  const createClient = useApp((s) => s.createClient);
  const startBinder = useApp((s) => s.startBinder);
  const [selected, setSelected] = useState<number | 'new' | null>(clients.length ? null : 'new');
  const [name, setName] = useState('');
  const [year, setYear] = useState(defaultYear);
  const [error, setError] = useState<string | null>(null);
  const nameId = useId();
  const yearId = useId();

  useEffect(() => {
    const onPick = (e: Event) => {
      setSelected((e as CustomEvent<number>).detail);
    };
    window.addEventListener('binderready:pick-client', onPick);
    return () => {
      window.removeEventListener('binderready:pick-client', onPick);
    };
  }, []);

  const start = async () => {
    setError(null);
    try {
      let client: Client | undefined;
      if (selected === 'new') client = await createClient(name);
      else client = clients.find((c) => c.id === selected);
      if (!client) {
        setError('Choose a client or add a new one.');
        return;
      }
      await startBinder(client, year);
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="h-full overflow-y-auto px-12 py-10">
      <div className="mx-auto max-w-3xl">
        <p className="eyebrow">New binder</p>
        <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.03em]">
          Who is this binder for?
        </h1>

        <div className="mt-8 grid gap-6 md:grid-cols-[1fr_200px]">
          <Card>
            <CardHeader>
              <CardTitle>Client</CardTitle>
            </CardHeader>
            <CardBody className="space-y-1.5">
              {clients.length ? (
                <ul
                  className="max-h-60 space-y-1 overflow-y-auto"
                  role="radiogroup"
                  aria-label="Existing clients"
                >
                  {clients.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected === c.id}
                        onClick={() => {
                          setSelected(c.id);
                        }}
                        className={cx(
                          'flex w-full items-center justify-between rounded-control border px-3 py-2 text-left text-sm',
                          selected === c.id
                            ? 'border-fg'
                            : 'border-border hover:border-border-strong',
                        )}
                      >
                        {c.displayName}
                        <span className="font-mono text-xs text-fg-subtle">
                          {c.lastYear ? `last binder ${String(c.lastYear)}` : 'new'}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setSelected('new');
                }}
                aria-pressed={selected === 'new'}
                className={cx(
                  'w-full rounded-control border border-dashed px-3 py-2 text-left text-sm',
                  selected === 'new'
                    ? 'border-fg'
                    : 'border-border-strong text-fg-muted hover:text-fg',
                )}
              >
                + Add a new client
              </button>
              {selected === 'new' ? (
                <div className="pt-2">
                  <label htmlFor={nameId} className="text-xs text-fg-muted">
                    Display name
                  </label>
                  <input
                    id={nameId}
                    autoFocus
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void start();
                    }}
                    placeholder="Jane Sample"
                    className="mt-1 h-9 w-full rounded-control border border-border-strong bg-bg px-3 text-sm outline-none focus:border-fg"
                  />
                </div>
              ) : null}
            </CardBody>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Tax year</CardTitle>
            </CardHeader>
            <CardBody>
              <label htmlFor={yearId} className="sr-only">
                Tax year
              </label>
              <select
                id={yearId}
                value={year}
                onChange={(e) => {
                  setYear(Number(e.target.value));
                }}
                className="h-9 w-full rounded-control border border-border-strong bg-bg px-2 font-mono text-sm outline-none focus:border-fg"
              >
                {[thisYear, thisYear - 1, thisYear - 2, thisYear - 3].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </CardBody>
          </Card>
        </div>

        <div className="mt-6">
          {pending.length ? (
            <p className="mb-3 text-sm text-fg-muted">
              {pending.length} {pending.length === 1 ? 'file' : 'files'} ready. Add more, or start.
            </p>
          ) : null}
          <DropZone
            compact
            title={pending.length ? 'Drop more documents' : 'Drop the client’s documents here'}
            onFiles={queuePaths}
          />
        </div>

        {error ? (
          <p role="alert" className="mt-4 text-sm text-danger">
            {error}
          </p>
        ) : null}
        <div className="mt-6 flex justify-end">
          <Button
            onClick={() => void start()}
            disabled={selected === null || (selected === 'new' && !name.trim())}
          >
            {pending.length ? 'Start binder' : 'Start empty binder'}
          </Button>
        </div>
      </div>
    </div>
  );
}
