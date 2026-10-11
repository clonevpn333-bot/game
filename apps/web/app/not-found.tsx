import { buttonStyles } from '@binderready/design';
import Link from 'next/link';
import { PageHeader } from '@/components/page-header';

export default function NotFound() {
  return (
    <PageHeader
      eyebrow="404"
      title="This page isn’t in the binder."
      lede="The link may be old or mistyped."
    >
      <div className="mt-8 flex flex-wrap gap-3">
        <Link href="/" className={buttonStyles()}>
          Go to the home page
        </Link>
        <Link href="/docs/" className={buttonStyles({ variant: 'secondary' })}>
          Read the docs
        </Link>
      </div>
    </PageHeader>
  );
}
