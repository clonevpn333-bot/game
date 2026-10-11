import { Mark } from '@binderready/design';
import Link from 'next/link';
import { site } from '@/site.config';

export function Wordmark() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 rounded-control text-[15px] font-semibold tracking-[-0.02em]"
    >
      <Mark className="text-[20px]" />
      {site.productName}
      <span className="sr-only">home</span>
    </Link>
  );
}
