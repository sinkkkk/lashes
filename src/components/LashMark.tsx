/** A closed eye with lashes: the little logo mark. */
export function LashMark({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 32" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" className={className} aria-hidden>
      <path d="M4 10c8 12 48 12 56 0" />
      <path d="M12 16.5l-3 7M20 19.5l-1.6 7.5M28 21l-.4 7.6M36 21l.4 7.6M44 19.5l1.6 7.5M52 16.5l3 7" />
    </svg>
  );
}
