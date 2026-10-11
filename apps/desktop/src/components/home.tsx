import { useApp } from '../state/store';
import { DropZone } from './drop-zone';

export function Home() {
  const queuePaths = useApp((s) => s.queuePaths);
  return (
    <div className="flex h-full flex-col justify-center px-12 py-10">
      <div className="mx-auto w-full max-w-3xl">
        <p className="eyebrow">New binder</p>
        <h1 className="mt-3 text-[28px] font-semibold tracking-[-0.03em]">
          Start with a client’s documents.
        </h1>
        <p className="mt-2 max-w-[56ch] text-[15px] text-fg-muted">
          Drop everything they sent. You’ll pick the client next, and nothing leaves this computer.
        </p>
        <div className="mt-8">
          <DropZone title="Drop a client’s documents here" onFiles={queuePaths} />
        </div>
      </div>
    </div>
  );
}
