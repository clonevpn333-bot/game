import type { ComponentProps } from 'react';
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonStyleOptions {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  className?: string | undefined;
}

const base =
  'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-control font-medium ' +
  'transition-[background-color,border-color,color] duration-150 ease-out-steel ' +
  'disabled:cursor-not-allowed disabled:opacity-45 [&_svg]:size-4 [&_svg]:shrink-0';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-fg text-bg not-disabled:hover:bg-fg/85',
  secondary: 'border border-border-strong bg-transparent text-fg not-disabled:hover:bg-fg/6',
  ghost: 'bg-transparent text-fg-muted not-disabled:hover:bg-fg/6 not-disabled:hover:text-fg',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[13px]',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-[15px]',
};

/** Class string for anything that should look like a button (e.g. a framework Link). */
export function buttonStyles({
  variant = 'primary',
  size = 'md',
  className,
}: ButtonStyleOptions = {}): string {
  return cx(base, variants[variant], sizes[size], className);
}

export type ButtonProps = ComponentProps<'button'> & Omit<ButtonStyleOptions, 'className'>;

export function Button({ variant, size, className, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={buttonStyles({ variant, size, className })} {...props} />;
}

export type ButtonLinkProps = ComponentProps<'a'> & Omit<ButtonStyleOptions, 'className'>;

export function ButtonLink({ variant, size, className, ...props }: ButtonLinkProps) {
  return <a className={buttonStyles({ variant, size, className })} {...props} />;
}
