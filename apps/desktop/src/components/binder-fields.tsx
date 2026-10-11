/**
 * Binder settings controls shared by the export dialog and Settings: category
 * order, document-name template and image quality.
 */
import { cx } from '@binderready/design';
import type { CategoryId } from '@binderready/engine';
import { ArrowDown, ArrowUp, GripVertical } from 'lucide-react';
import { useId, useRef, useState, type ReactNode } from 'react';
import { categoryName } from '../lib/catalog';
import { QUALITY_PRESETS, type Quality } from '../lib/export-plan';

export const TOKENS = ['{year}', '{form}', '{issuer}', '{client}'] as const;

export const templateIsValid = (template: string) => TOKENS.some((t) => template.includes(t));

export function OrderList({
  order,
  counts,
  onMove,
}: {
  order: CategoryId[];
  counts: Map<CategoryId, number>;
  onMove: (from: number, to: number) => void;
}) {
  const [dragging, setDragging] = useState<number | null>(null);
  return (
    <ol className="mt-3 space-y-1" aria-label="Category order">
      {order.map((category, i) => {
        const count = counts.get(category) ?? 0;
        const name = categoryName.get(category) ?? category;
        return (
          <li
            key={category}
            draggable
            onDragStart={(e) => {
              setDragging(i);
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', category);
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragging !== null && dragging !== i) {
                onMove(dragging, i);
                setDragging(i);
              }
            }}
            onDragEnd={() => {
              setDragging(null);
            }}
            className={cx(
              'group flex h-8 items-center gap-2 rounded-control border px-2 text-sm',
              dragging === i ? 'border-fg bg-bg-subtle' : 'border-border',
              // Mute categories with nothing in this binder (Settings passes no counts).
              counts.size > 0 && !count ? 'text-fg-subtle' : 'text-fg',
            )}
          >
            <GripVertical
              className="size-4 shrink-0 cursor-grab text-fg-subtle"
              strokeWidth={1.5}
              aria-hidden
            />
            <span className="w-5 font-mono text-xs text-fg-subtle tabular">{i + 1}</span>
            <span className="min-w-0 flex-1 truncate">{name}</span>
            {count ? (
              <span className="font-mono text-xs text-fg-muted tabular">{count}</span>
            ) : null}
            <span className="flex opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
              <IconButton
                label={`Move ${name} up`}
                disabled={i === 0}
                onClick={() => {
                  onMove(i, i - 1);
                }}
              >
                <ArrowUp strokeWidth={1.5} aria-hidden />
              </IconButton>
              <IconButton
                label={`Move ${name} down`}
                disabled={i === order.length - 1}
                onClick={() => {
                  onMove(i, i + 1);
                }}
              >
                <ArrowDown strokeWidth={1.5} aria-hidden />
              </IconButton>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-6 place-items-center rounded-control text-fg-muted hover:bg-bg-subtle hover:text-fg disabled:opacity-30 [&_svg]:size-3.5"
    >
      {children}
    </button>
  );
}

export function Toggle({
  label,
  detail,
  checked,
  onChange,
}: {
  label: string;
  detail: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="group relative flex cursor-pointer items-center gap-3 px-3 py-2.5"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm">{label}</span>
        <span className="block text-xs text-fg-muted">{detail}</span>
      </span>
      <input
        id={id}
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => {
          onChange(e.target.checked);
        }}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className="relative h-5 w-9 shrink-0 rounded-full border border-border-strong bg-bg-subtle transition-colors peer-checked:border-fg peer-checked:bg-fg peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-focus"
      >
        <span className="absolute left-0.5 top-0.5 size-3.5 rounded-full bg-fg-muted transition-transform group-has-checked:translate-x-4 group-has-checked:bg-bg" />
      </span>
    </label>
  );
}

export function TemplateField({
  template,
  valid,
  preview,
  onChange,
}: {
  template: string;
  valid: boolean;
  preview: string | null;
  onChange: (template: string) => void;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const insert = (token: string) => {
    const el = input.current;
    const at = el?.selectionStart ?? template.length;
    const end = el?.selectionEnd ?? at;
    onChange(`${template.slice(0, at)}${token}${template.slice(end)}`);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(at + token.length, at + token.length);
    });
  };
  return (
    <section>
      <label htmlFor={id} className="text-sm font-medium">
        Document names
      </label>
      <input
        id={id}
        ref={input}
        value={template}
        spellCheck={false}
        onChange={(e) => {
          onChange(e.target.value);
        }}
        aria-invalid={!valid}
        aria-describedby={`${id}-preview`}
        className="mt-2 h-9 w-full rounded-control border border-border-strong bg-bg px-3 font-mono text-[13px] outline-none focus:border-fg aria-invalid:border-danger"
      />
      <div className="mt-2 flex flex-wrap gap-1">
        {TOKENS.map((token) => (
          <button
            key={token}
            type="button"
            onClick={() => {
              insert(token);
            }}
            className="rounded-control border border-border px-1.5 py-0.5 font-mono text-xs text-fg-muted hover:border-border-strong hover:text-fg"
          >
            {token}
          </button>
        ))}
      </div>
      <p id={`${id}-preview`} className="mt-2 truncate text-xs text-fg-muted">
        {valid ? (
          <>
            Example: <span className="font-mono text-fg">{preview ?? '—'}</span>
          </>
        ) : (
          <span className="text-danger">Use at least one of {TOKENS.join(' ')}.</span>
        )}
      </p>
    </section>
  );
}

export function QualityField({
  quality,
  onChange,
  hideLegend = false,
}: {
  quality: Quality;
  onChange: (quality: Quality) => void;
  /** When a surrounding row already titles the field (the legend stays for screen readers). */
  hideLegend?: boolean;
}) {
  return (
    <fieldset>
      <legend className={hideLegend ? 'sr-only' : 'text-sm font-medium'}>Image quality</legend>
      <div className={cx('grid grid-cols-3 gap-1.5', !hideLegend && 'mt-2')}>
        {QUALITY_PRESETS.map((preset) => (
          <label
            key={preset.id}
            className={cx(
              'relative cursor-pointer rounded-control border px-2.5 py-2 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-focus',
              quality === preset.id ? 'border-fg' : 'border-border hover:border-border-strong',
            )}
          >
            <input
              type="radio"
              name="quality"
              value={preset.id}
              checked={quality === preset.id}
              onChange={() => {
                onChange(preset.id);
              }}
              className="sr-only"
            />
            <span className="block text-sm">{preset.label}</span>
            <span className="block text-[11px] leading-tight text-fg-muted">{preset.detail}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
