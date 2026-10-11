import { useEffect, useState } from 'react';
import { backend, inTauri, type AppInfo } from './backend';

let cached: Promise<AppInfo> | null = null;

export function useAppInfo(): AppInfo | null {
  const [info, setInfo] = useState<AppInfo | null>(null);
  useEffect(() => {
    if (!inTauri) return;
    cached ??= backend.appInfo();
    void cached.then(setInfo);
  }, []);
  return info;
}

export const isMac = typeof navigator !== 'undefined' && /Mac/i.test(navigator.platform);
export const modKey = isMac ? '⌘' : 'Ctrl';
