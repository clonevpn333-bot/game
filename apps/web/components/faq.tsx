import { Plus } from 'lucide-react';
import type { Faq } from '@/lib/content';

/** Native <details> accordion: keyboard and screen-reader behavior come from the browser. */
export function FaqList({ items }: { items: Faq[] }) {
  return (
    <div className="divide-y divide-border border-y border-border">
      {items.map((faq) => (
        <details key={faq.id} id={`faq-${faq.id}`} className="faq-item group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-left text-[17px] font-medium tracking-[-0.01em] [&::-webkit-details-marker]:hidden">
            {faq.question}
            <Plus
              className="size-4 shrink-0 text-fg-muted transition-transform duration-200 ease-out-steel group-open:rotate-45"
              strokeWidth={1.5}
              aria-hidden
            />
          </summary>
          <div className="max-w-[68ch] space-y-3 pb-6 text-[15px] text-fg-muted">
            {faq.answer.map((p) => (
              <p key={p}>{p}</p>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}
