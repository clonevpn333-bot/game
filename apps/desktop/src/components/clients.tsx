import { Button } from '@binderready/design';
import { Users } from 'lucide-react';
import { useApp } from '../state/store';

export function Clients() {
  const clients = useApp((s) => s.clients);
  const go = useApp((s) => s.go);
  const batch = useApp((s) => s.batch);
  return (
    <div className="h-full overflow-y-auto px-10 py-8">
      <div className="flex items-end justify-between">
        <div>
          <p className="eyebrow">Clients</p>
          <h1 className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">
            {clients.length} {clients.length === 1 ? 'client' : 'clients'}
          </h1>
        </div>
        {!batch ? (
          <Button
            size="sm"
            onClick={() => {
              go('new-binder');
            }}
          >
            New binder
          </Button>
        ) : null}
      </div>
      {clients.length === 0 ? (
        <div className="mt-16 flex flex-col items-center gap-3 text-center">
          <Users className="size-8 text-fg-subtle" strokeWidth={1.25} aria-hidden />
          <p className="text-[15px] font-medium">No clients yet</p>
          <p className="max-w-[40ch] text-sm text-fg-muted">
            Clients are added when you start a binder. Only a display name is stored.
          </p>
        </div>
      ) : (
        <table className="mt-6 w-full text-left text-[13px]">
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="eyebrow py-2 font-normal">
                Name
              </th>
              <th scope="col" className="eyebrow py-2 font-normal">
                Last binder
              </th>
              <th scope="col" className="eyebrow py-2 font-normal">
                Added
              </th>
              <th scope="col" className="py-2">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <tr key={c.id} className="border-b border-border">
                <td className="py-2.5">{c.displayName}</td>
                <td className="py-2.5 font-mono text-fg-muted tabular">{c.lastYear ?? '—'}</td>
                <td className="py-2.5 font-mono text-fg-muted tabular">
                  {c.createdAt.slice(0, 10)}
                </td>
                <td className="py-2.5 text-right">
                  {!batch ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        go('new-binder');
                        window.dispatchEvent(
                          new CustomEvent('binderready:pick-client', { detail: c.id }),
                        );
                      }}
                    >
                      New binder
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
