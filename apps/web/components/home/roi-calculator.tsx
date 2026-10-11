'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { useReducedMotion } from '@/lib/use-reduced-motion';

const usd = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});
const usdCents = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

/** Eases a displayed number toward its target in ~220ms; instant with reduced motion. */
function useTweened(target: number) {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(target);
  const from = useRef(target);
  useEffect(() => {
    const start = from.current;
    if (start === target || reduced) {
      from.current = target;
      return;
    }
    const began = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - began) / 220);
      const eased = 1 - (1 - t) ** 3;
      const next = start + (target - start) * eased;
      from.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [target, reduced]);
  return reduced ? target : value;
}

export function RoiCalculator({ price, productName }: { price: number; productName: string }) {
  const [returns, setReturns] = useState(300);
  const [costInput, setCostInput] = useState('5');
  const sliderId = useId();
  const costId = useId();

  const cost = Number.parseFloat(costInput);
  const validCost = Number.isFinite(cost) && cost > 0 ? cost : null;
  const seasonCost = validCost ? returns * validCost : 0;
  const breakEven = validCost ? Math.ceil(price / validCost) : null;
  const shownSeason = useTweened(seasonCost);
  const shownBreakEven = useTweened(breakEven ?? 0);

  return (
    <div className="grid gap-px overflow-hidden rounded-[14px] border border-border-strong bg-border lg:grid-cols-[1fr_1.1fr]">
      <div className="flex flex-col gap-8 bg-surface p-6 md:p-8">
        <div>
          <div className="flex items-baseline justify-between gap-4">
            <label htmlFor={sliderId} className="text-sm font-medium">
              Returns per season
            </label>
            <output htmlFor={sliderId} className="tabular font-mono text-2xl tracking-[-0.02em]">
              {returns.toLocaleString('en-US')}
            </output>
          </div>
          <input
            id={sliderId}
            type="range"
            min={50}
            max={1000}
            step={10}
            value={returns}
            onChange={(e) => {
              setReturns(Number(e.target.value));
            }}
            className="mt-4 h-6 w-full cursor-pointer accent-[var(--fg)]"
          />
          <div className="mt-1 flex justify-between font-mono text-xs text-fg-subtle" aria-hidden>
            <span>50</span>
            <span>1,000</span>
          </div>
        </div>
        <div>
          <label htmlFor={costId} className="text-sm font-medium">
            Per-return cost of an organizing service
          </label>
          <div className="mt-3 flex h-10 w-40 items-center rounded-control border border-border-strong bg-bg px-3 focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus">
            <span className="font-mono text-sm text-fg-muted" aria-hidden>
              $
            </span>
            <input
              id={costId}
              inputMode="decimal"
              value={costInput}
              onChange={(e) => {
                setCostInput(e.target.value.replace(/[^0-9.]/g, ''));
              }}
              aria-describedby={`${costId}-hint`}
              className="tabular w-full bg-transparent pl-1 font-mono text-sm outline-none"
            />
          </div>
          <p id={`${costId}-hint`} className="mt-2 text-xs text-fg-muted">
            What you pay per return today, in dollars.
          </p>
        </div>
      </div>
      <div className="flex flex-col justify-between gap-8 bg-bg p-6 md:p-8" aria-live="polite">
        {validCost ? (
          <>
            <dl className="grid grid-cols-2 gap-6">
              <div>
                <dt className="text-sm text-fg-muted">Organizing service, this season</dt>
                <dd className="tabular mt-2 font-mono text-3xl tracking-[-0.03em] md:text-4xl">
                  {usd.format(Math.round(shownSeason))}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-fg-muted">{productName}, once</dt>
                <dd className="tabular mt-2 font-mono text-3xl tracking-[-0.03em] md:text-4xl">
                  {usd.format(price)}
                </dd>
              </div>
            </dl>
            <p className="text-[15px] text-fg-muted">
              This season:{' '}
              <strong className="tabular font-mono font-medium text-fg">
                {usd.format(seasonCost)}
              </strong>{' '}
              vs.{' '}
              <strong className="tabular font-mono font-medium text-fg">{usd.format(price)}</strong>{' '}
              once. {productName} pays for itself after{' '}
              <strong className="tabular font-mono font-medium text-fg">
                {Math.round(shownBreakEven).toLocaleString('en-US')}
              </strong>{' '}
              {breakEven === 1 ? 'return' : 'returns'}.
            </p>
          </>
        ) : (
          <p className="text-[15px] text-fg-muted">
            Enter what an organizing service charges you per return, for example{' '}
            {usdCents.format(5)}, to compare.
          </p>
        )}
      </div>
    </div>
  );
}
