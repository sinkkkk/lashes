/** Shown instantly while an admin page loads, so tapping a tab always feels immediate. */
export default function Loading() {
  return (
    <div className="animate-pulse space-y-3 pt-1" aria-busy="true" aria-label="Laen…">
      <div className="h-4 w-2/3 rounded-full bg-line/70" />
      <div className="h-24 rounded-2xl bg-white ring-1 ring-line" />
      <div className="h-24 rounded-2xl bg-white ring-1 ring-line" />
      <div className="h-24 rounded-2xl bg-white ring-1 ring-line" />
    </div>
  );
}
