import type { MDXComponents } from 'mdx/types';
import { mdxComponents } from '@/components/prose';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return { ...mdxComponents, ...components };
}
