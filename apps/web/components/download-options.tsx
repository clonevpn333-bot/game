'use client';

import { buttonStyles, cx } from '@binderready/design';
import { Download } from 'lucide-react';
import { useSyncExternalStore } from 'react';

type Os = 'windows' | 'mac';

function detectOs(): Os {
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ??
    navigator.userAgent;
  return /mac|iphone|ipad/i.test(platform) ? 'mac' : 'windows';
}

const subscribe = () => () => {};

export interface DownloadTarget {
  url: string | null;
  label: string;
  file: string;
  /** A second build for the same system, offered as a text link (Intel Macs). */
  alternate?: { url: string | null; label: string };
}

/** Windows is primary unless the visitor is on a Mac. Server render assumes Windows. */
export function DownloadOptions({
  windows,
  mac,
}: {
  windows: DownloadTarget;
  mac: DownloadTarget;
}) {
  const os = useSyncExternalStore<Os>(subscribe, detectOs, () => 'windows');
  const order: [Os, DownloadTarget][] =
    os === 'mac'
      ? [
          ['mac', mac],
          ['windows', windows],
        ]
      : [
          ['windows', windows],
          ['mac', mac],
        ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-3">
        {order.map(([key, target], i) =>
          target.url ? (
            <a
              key={key}
              href={target.url}
              className={buttonStyles({ variant: i === 0 ? 'primary' : 'secondary' })}
            >
              <Download strokeWidth={1.5} />
              {target.label}
            </a>
          ) : (
            <span
              key={key}
              className={cx(
                buttonStyles({ variant: i === 0 ? 'primary' : 'secondary' }),
                'pointer-events-none opacity-45',
              )}
              aria-disabled="true"
            >
              {target.label}
            </span>
          ),
        )}
      </div>
      <p className="font-mono text-xs text-fg-subtle">
        {os === 'mac' ? 'You’re on a Mac. ' : ''}
        {order[0]?.[1].file} · {order[1]?.[1].file}
      </p>
      {mac.alternate?.url ? (
        <p className="text-sm text-fg-muted">
          <a href={mac.alternate.url} className="text-fg underline underline-offset-4">
            {mac.alternate.label}
          </a>
        </p>
      ) : null}
    </div>
  );
}
