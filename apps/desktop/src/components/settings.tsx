import { ThemeSwitcher } from '@binderready/design';
import type { ReactNode } from 'react';
import { themeStore } from '../lib/theme';
import { useAppInfo } from '../lib/platform';
import { PRODUCT_NAME } from '../lib/product';

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-8 py-5">
      <div className="max-w-[46ch]">
        <p className="text-[14px] font-medium">{title}</p>
        <p className="mt-1 text-[13px] text-fg-muted">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function Settings() {
  const info = useAppInfo();
  return (
    <div className="h-full overflow-y-auto px-10 py-8">
      <p className="eyebrow">Settings</p>
      <h1 className="mt-2 text-[22px] font-semibold tracking-[-0.02em]">Settings</h1>
      <section aria-labelledby="appearance" className="mt-8">
        <h2 id="appearance" className="text-[13px] font-medium text-fg-muted">
          Appearance
        </h2>
        <div className="divide-y divide-border border-y border-border">
          <Row title="Theme" description="System follows your computer’s light or dark setting.">
            <ThemeSwitcher store={themeStore} />
          </Row>
        </div>
      </section>
      <section aria-labelledby="about" className="mt-10">
        <h2 id="about" className="text-[13px] font-medium text-fg-muted">
          About
        </h2>
        <div className="divide-y divide-border border-y border-border">
          <Row title="Version" description={`The installed version of ${PRODUCT_NAME}.`}>
            <span className="font-mono text-[13px]">{info?.version ?? '…'}</span>
          </Row>
          <Row title="Text recognition" description="Scans and photos are read on this computer.">
            <span className="font-mono text-[13px]">{info ? 'Tesseract 5' : '…'}</span>
          </Row>
          <Row
            title="App data folder"
            description="Settings, your client list and binder history are stored here. Page images are kept in a cache only while you work and are deleted when the app next starts. Document text is never stored."
          >
            <span
              className="block max-w-[320px] break-all text-right font-mono text-xs text-fg-muted"
              data-selectable
            >
              {info?.dataDir ?? '…'}
            </span>
          </Row>
        </div>
      </section>
    </div>
  );
}
