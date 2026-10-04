/**
 * Visible runtime error reporting. Errors on players' machines otherwise vanish into the console
 * and leave a black screen; this shows a small dismissable panel with the message instead.
 */
const seen = new Set<string>();
let box: HTMLDivElement | null = null;

export function reportError(where: string, err: unknown): void {
  const e = err as { message?: string; stack?: string; name?: string };
  if (e?.name === 'Abort' || e?.constructor?.name === 'Abort') return;
  const msg = `${where}: ${e?.message ?? String(err)}`;
  console.error(msg, err);
  if (seen.has(msg) || seen.size > 6) return;
  seen.add(msg);
  if (!box) {
    box = document.createElement('div');
    box.id = 'error-report';
    box.style.cssText =
      'position:fixed;left:12px;bottom:12px;max-width:min(560px,calc(100vw - 24px));z-index:200;background:rgba(40,8,8,.92);' +
      'border:1px solid #a04040;color:#ffd8d0;font:12px/1.5 system-ui,sans-serif;padding:10px 34px 10px 12px;white-space:pre-wrap;pointer-events:auto';
    const close = document.createElement('button');
    close.textContent = '✕';
    close.style.cssText = 'position:absolute;top:4px;right:6px;background:none;border:none;color:#ffd8d0;font-size:15px;cursor:pointer';
    close.onclick = () => {
      box?.remove();
      box = null;
    };
    box.appendChild(close);
    const title = document.createElement('div');
    title.textContent = 'Something went wrong (the game will try to keep going). Please send this text:';
    title.style.cssText = 'font-weight:600;margin-bottom:4px';
    box.appendChild(title);
    document.body.appendChild(box);
  }
  const line = document.createElement('div');
  const frame = (e?.stack ?? '').split('\n').slice(1, 2).join('').trim();
  line.textContent = `• ${msg}${frame ? `\n   ${frame.slice(0, 160)}` : ''}`;
  box.appendChild(line);
}

/** Wraps an object so a throwing method logs once and returns a harmless no-op instead. */
export function safe<T extends object>(target: T, label: string): T {
  const noop: unknown = new Proxy(function () {}, {
    get: (_t, k) => (k === 'then' ? undefined : noop),
    apply: () => noop,
  });
  return new Proxy(target, {
    get(t, k, r) {
      const v = Reflect.get(t, k, r);
      if (typeof v !== 'function') return v;
      return (...args: unknown[]) => {
        try {
          return v.apply(t, args);
        } catch (err) {
          console.warn(`${label}.${String(k)} failed`, err);
          return noop;
        }
      };
    },
  });
}
