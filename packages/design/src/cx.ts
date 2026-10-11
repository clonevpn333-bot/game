import { extendTailwindMerge } from 'tailwind-merge';

// Teach tailwind-merge the preset's custom theme keys; otherwise `text-display`
// is read as a color and would be dropped next to `text-fg`.
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['display', 'h2', 'body', 'label'],
      radius: ['control', 'card', 'panel'],
      ease: ['out-steel'],
    },
  },
});

type ClassValue = string | false | null | undefined;

/** Joins class names; later Tailwind utilities override earlier conflicting ones. */
export function cx(...classes: ClassValue[]): string {
  return twMerge(classes.filter(Boolean).join(' '));
}
