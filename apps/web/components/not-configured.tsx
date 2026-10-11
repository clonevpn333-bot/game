/** Visible marker for a value Corey still has to supply. Release builds refuse to build with any. */
export function NotConfigured({ name }: { name: string }) {
  return (
    <span className="rounded-[4px] border border-dashed border-warning px-1 font-mono text-[0.85em] text-warning">
      {name} not set
    </span>
  );
}
