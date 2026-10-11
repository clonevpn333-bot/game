import { cx, Kbd } from '@binderready/design';
import type { MDXComponents } from 'mdx/types';
import Link from 'next/link';
import { Children, isValidElement, type ComponentProps, type ReactNode } from 'react';
import type React from 'react';

function textOf(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return '';
}

export function slugify(node: ReactNode): string {
  return textOf(node)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function Anchor({ href = '', children }: ComponentProps<'a'>) {
  const className =
    'text-fg underline decoration-border-strong underline-offset-4 hover:decoration-fg';
  if (href.startsWith('/') || href.startsWith('#')) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <a href={href} className={className}>
      {children}
    </a>
  );
}

type P<T extends keyof React.JSX.IntrinsicElements> = ComponentProps<T>;

function H2({ className, children, ...p }: P<'h2'>) {
  return (
    <h2
      id={slugify(children)}
      className={cx(
        'mt-14 scroll-mt-24 text-2xl font-semibold tracking-[-0.025em] text-balance',
        className,
      )}
      {...p}
    >
      {children}
    </h2>
  );
}

function H3({ className, children, ...p }: P<'h3'>) {
  return (
    <h3
      id={slugify(children)}
      className={cx('mt-10 scroll-mt-24 text-lg font-semibold tracking-[-0.015em]', className)}
      {...p}
    >
      {children}
    </h3>
  );
}

const styled =
  <T extends keyof React.JSX.IntrinsicElements>(Tag: T, base: string) =>
  ({ className, ...p }: P<T>) => {
    const Element = Tag as React.ElementType;
    return <Element className={cx(base, className)} {...p} />;
  };

function Table({ className, ...p }: P<'table'>) {
  return (
    <div
      className="mt-6 overflow-x-auto rounded-[10px] border border-border"
      role="region"
      tabIndex={0}
      aria-label="Table"
    >
      <table className={cx('w-full min-w-[480px] text-left text-[14px]', className)} {...p} />
    </div>
  );
}

/** Typography for MDX docs, changelog and legal pages. */
export const mdxComponents = {
  h1: styled(
    'h1',
    'text-[2.25rem] font-semibold leading-tight tracking-[-0.035em] text-balance md:text-[2.75rem]',
  ),
  h2: H2,
  h3: H3,
  p: styled('p', 'mt-4 text-[15px] leading-7 text-fg-muted'),
  ul: styled(
    'ul',
    'mt-4 list-disc space-y-2 pl-5 text-[15px] leading-7 text-fg-muted marker:text-fg-subtle',
  ),
  ol: styled(
    'ol',
    'mt-4 list-decimal space-y-2 pl-5 text-[15px] leading-7 text-fg-muted marker:font-mono marker:text-fg-subtle',
  ),
  li: styled('li', 'pl-1'),
  strong: styled('strong', 'font-medium text-fg'),
  a: Anchor,
  hr: () => <hr className="mt-12 border-border" />,
  code: styled(
    'code',
    'break-words rounded-[4px] border border-border bg-bg-subtle px-1.5 py-0.5 font-mono text-[13px] text-fg',
  ),
  blockquote: styled('blockquote', 'mt-6 border-l-2 border-border-strong pl-4 [&>p]:mt-0'),
  table: Table,
  th: styled(
    'th',
    'border-b border-border bg-bg-subtle px-4 py-2.5 font-mono text-xs font-normal uppercase tracking-[0.06em] text-fg-subtle',
  ),
  td: styled('td', 'border-b border-border px-4 py-2.5 align-top text-fg-muted'),
  Kbd,
} satisfies MDXComponents;

export function hasChildren(node: ReactNode) {
  return Children.count(node) > 0;
}
