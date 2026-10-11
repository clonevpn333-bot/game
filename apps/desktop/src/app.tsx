import { getCurrentWebview } from '@tauri-apps/api/webview';
import { useEffect } from 'react';
import { CommandPalette } from './components/command-palette';
import { Clients } from './components/clients';
import { Home } from './components/home';
import { NewBinder } from './components/new-binder';
import { Processing } from './components/processing';
import { Recent } from './components/recent';
import { ReviewBoard } from './components/review-board';
import { Settings } from './components/settings';
import { Sidebar } from './components/sidebar';
import { TitleBar } from './components/title-bar';
import { PRODUCT_NAME } from './lib/product';
import { backend, inTauri } from './lib/backend';
import { useApp } from './state/store';

function useBackendEvents() {
  useEffect(() => {
    if (!inTauri) return;
    const unlisten = [
      backend.onProgress((p) => {
        useApp.getState().onProgress(p);
      }),
      backend.onFile((batchId, file) => {
        useApp.getState().onFile(batchId, file);
      }),
      // Files or folders dropped anywhere on the window.
      getCurrentWebview().onDragDropEvent((event) => {
        if (event.payload.type !== 'drop') return;
        void backend.expandPaths(event.payload.paths).then((paths) => {
          const s = useApp.getState();
          if (s.batch) void s.addPaths(paths);
          else s.queuePaths(paths);
        });
      }),
    ];
    void useApp.getState().loadClients();
    void useApp.getState().loadPrefs();
    return () => {
      for (const u of unlisten)
        void u.then((f) => {
          f();
        });
    };
  }, []);
}

export function App() {
  const view = useApp((s) => s.view);
  useBackendEvents();
  if (!inTauri) {
    return (
      <div className="grid h-full place-items-center p-10 text-center">
        <p className="max-w-[44ch] text-sm text-fg-muted">
          This is the {PRODUCT_NAME} desktop interface. Open it through the app (pnpm dev in
          apps/desktop) so it can read files on this computer.
        </p>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col bg-bg text-fg">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Sidebar />
        <main className="min-h-0 min-w-0 flex-1 overflow-clip">
          {view === 'home' ? <Home /> : null}
          {view === 'new-binder' ? <NewBinder /> : null}
          {view === 'processing' ? <Processing /> : null}
          {view === 'review' ? <ReviewBoard /> : null}
          {view === 'clients' ? <Clients /> : null}
          {view === 'recent' ? <Recent /> : null}
          {view === 'settings' ? <Settings /> : null}
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
