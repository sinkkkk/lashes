"use client";

/** Five big tappable stars; sends the chosen number as the form field `name`. */
export function StarInput({ value, onChange, name = "rating" }: { value: number; onChange: (n: number) => void; name?: string }) {
  return (
    <>
      <div className="flex justify-between">
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" onClick={() => onChange(i)} className="p-1 transition active:scale-90" aria-label={`${i}/5`} aria-pressed={i === value}>
            <svg viewBox="0 0 20 20" className={`h-12 w-12 ${i <= value ? "text-accent" : "text-line"}`} fill="currentColor">
              <path d="M10 1.8l2.5 5.2 5.7.8-4.1 4 1 5.7L10 14.8l-5.1 2.7 1-5.7-4.1-4 5.7-.8z" />
            </svg>
          </button>
        ))}
      </div>
      <input type="hidden" name={name} value={value} />
    </>
  );
}
