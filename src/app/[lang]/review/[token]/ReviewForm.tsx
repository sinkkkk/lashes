"use client";
import { useActionState, useState } from "react";
import { dict, type Lang } from "@/lib/i18n";
import { submitReviewAction } from "../../actions";

export function ReviewForm({ token, lang, defaultName }: { token: string; lang: Lang; defaultName: string }) {
  const t = dict[lang];
  const [rating, setRating] = useState(0);
  const [state, action, pending] = useActionState(submitReviewAction.bind(null, token), null);

  if (state && "done" in state) return <p className="mt-8 rounded-2xl bg-white p-5 text-center ring-1 ring-line">💕 {t.thanksReview}</p>;

  return (
    <form action={action} className="mt-6 space-y-5">
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-muted">{t.yourRating}</legend>
        <div className="flex justify-between">
          {[1, 2, 3, 4, 5].map((i) => (
            <button key={i} type="button" onClick={() => setRating(i)} className="p-1" aria-label={`${i}/5`}>
              <svg viewBox="0 0 20 20" className={`h-12 w-12 ${i <= rating ? "text-accent" : "text-line"}`} fill="currentColor">
                <path d="M10 1.8l2.5 5.2 5.7.8-4.1 4 1 5.7L10 14.8l-5.1 2.7 1-5.7-4.1-4 5.7-.8z" />
              </svg>
            </button>
          ))}
        </div>
        <input type="hidden" name="rating" value={rating} />
      </fieldset>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-muted">{t.reviewText}</span>
        <textarea name="text" rows={4} maxLength={1000} className="input resize-none" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-muted">{t.displayName}</span>
        <input name="name" defaultValue={defaultName} maxLength={40} className="input" />
      </label>
      {state && "error" in state && <p className="text-sm text-accent">{t.error}</p>}
      <button disabled={!rating || pending} className="w-full rounded-full bg-ink py-4 text-lg font-semibold text-white disabled:bg-line disabled:text-muted">
        {pending ? t.sending : t.sendReview}
      </button>
    </form>
  );
}
