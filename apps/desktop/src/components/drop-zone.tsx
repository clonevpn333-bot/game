import { Button } from '@binderready/design';
import { open } from '@tauri-apps/plugin-dialog';
import { FilePlus2 } from 'lucide-react';

export const ACCEPTED = ['pdf', 'jpg', 'jpeg', 'png', 'heic', 'heif', 'tif', 'tiff'];

/** Opens the system file picker for supported documents. */
export async function pickFiles(): Promise<string[]> {
  const picked = await open({
    multiple: true,
    directory: false,
    filters: [{ name: 'Tax documents', extensions: ACCEPTED }],
  });
  if (!picked) return [];
  return Array.isArray(picked) ? picked : [picked];
}

export function DropZone({
  title,
  onFiles,
  compact,
}: {
  title: string;
  onFiles: (paths: string[]) => void;
  compact?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center rounded-panel border-2 border-dashed border-border-strong text-center ${compact ? 'gap-3 px-6 py-8' : 'gap-5 px-10 py-20'}`}
    >
      <FilePlus2
        className={compact ? 'size-6 text-fg-subtle' : 'size-9 text-fg-subtle'}
        strokeWidth={1.25}
        aria-hidden
      />
      <div>
        <p
          className={
            compact ? 'text-[15px] font-medium' : 'text-xl font-semibold tracking-[-0.02em]'
          }
        >
          {title}
        </p>
        <p className="mt-2 text-sm text-fg-muted">
          Files and folders both work. Multi-document scans are split automatically.
        </p>
      </div>
      <p className="font-mono text-xs uppercase tracking-[0.06em] text-fg-subtle">
        PDF · JPG · PNG · HEIC · TIFF
      </p>
      <Button
        variant="secondary"
        size="sm"
        onClick={() => {
          void pickFiles().then((paths) => {
            if (paths.length) onFiles(paths);
          });
        }}
      >
        Choose files…
      </Button>
    </div>
  );
}
