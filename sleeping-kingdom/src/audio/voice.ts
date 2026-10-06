import manifest from './voices.json';

type Entry = { f: string; d: number };
const LINES = manifest as Record<string, Entry>;
// Every clip is bundled; the release build inlines them so the game still plays from one file.
const URLS = import.meta.glob('./voice/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;
export const MUSIC = import.meta.glob('./music/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

/** Inner thoughts are Calder's, logged without a name. */
const key = (speaker: string, text: string) => `${speaker}|${text}`;

export function voiceClip(speaker: string, text: string): { url: string; dur: number } | null {
  const e = LINES[key(speaker, text)];
  if (!e) return null;
  const url = URLS[`./voice/${e.f}`];
  return url ? { url, dur: e.d } : null;
}

/** How long a line is on screen: the recorded read when there is one, else a reading-speed guess. */
export function lineDuration(speaker: string, text: string, min = 2.4, perChar = 0.062): number {
  const c = voiceClip(speaker, text);
  return c ? Math.max(min * 0.6, c.dur + 0.35) : Math.max(min, text.length * perChar);
}
