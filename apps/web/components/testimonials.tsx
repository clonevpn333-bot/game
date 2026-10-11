import testimonialsJson from '@/content/testimonials.json';
import { Band, SectionHeading } from './rails';

interface Testimonial {
  quote: string;
  name: string;
  role: string;
}

function parse(raw: unknown): Testimonial[] {
  if (!Array.isArray(raw)) throw new Error('content/testimonials.json must be an array');
  return raw.map((entry: unknown, i) => {
    const t = entry as Partial<Testimonial>;
    if (!t.quote || !t.name || !t.role) {
      throw new Error(`content/testimonials.json[${i}] needs quote, name and role`);
    }
    return { quote: t.quote, name: t.name, role: t.role };
  });
}

const testimonials = parse(testimonialsJson);

/** Renders only when real testimonials exist. The file ships empty. */
export function Testimonials() {
  if (testimonials.length === 0) return null;
  return (
    <Band labelledBy="testimonials-title">
      <div className="px-5 py-16 md:px-10 md:py-24">
        <SectionHeading id="testimonials-title" eyebrow="From preparers" title="In their words." />
        <ul className="mt-12 grid gap-px overflow-hidden rounded-[14px] border border-border bg-border md:grid-cols-2">
          {testimonials.map((t) => (
            <li key={t.name} className="bg-bg p-8">
              <blockquote className="text-[17px] text-pretty">“{t.quote}”</blockquote>
              <p className="mt-6 text-sm font-medium">{t.name}</p>
              <p className="text-sm text-fg-muted">{t.role}</p>
            </li>
          ))}
        </ul>
      </div>
    </Band>
  );
}
