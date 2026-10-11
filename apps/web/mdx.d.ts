declare module '*.mdx' {
  import type { ComponentType } from 'react';
  export const meta: unknown;
  const Component: ComponentType;
  export default Component;
}
