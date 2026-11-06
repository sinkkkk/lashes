"use client";

import { useActionState, useState } from "react";
import { StarInput } from "@/components/StarInput";
import { dict, type Lang } from "@/lib/i18n";
import { submitPublicReviewAction } from "../actions";

/** "Share your experience" form on hilleliis.ee/reviews. */
export function PublicReviewForm({ lang }: { lang: Lang }) {
  const t = dict[lang];
  const [rating, setRating] = useState(0);
  const [state, action, pending] = useActionState(submitPublicReviewAction, null);

  if (state && "done" in state) {
    return <p className="mt-6 rounded-2xl bg-white p-5 text-center ring-1 ring-line">💕 {t.thanksReview}</p>;
  }

  return (
    <form action={action} className="mt-6 space-y-4 rounded-2xl bg-white p-5 ring-1 ring-line">
      <div>
        <h2 className="font-display text-2xl font-semibold">{t.shareExperience}</h2>
        <p className="mt-1 text-sm text-muted">{t.shareIntro}</p>
      </div>
      <fieldset>
        <legend className="mb-1 text-sm font-medium text-muted">{t.yourRating}</legend>
        <StarInput value={rating} onChange={setRating} />
      </fieldset>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-muted">{t.reviewText}</span>
        <textarea name="text" rows={3} maxLength={1000} className="input resize-none" />
      </label>
      <label className="block">
        <span className="mb-1.5 block text-sm font-medium text-muted">{t.displayName}</span>
        <input name="name" required minLength={2} maxLength={40} autoComplete="given-name" className="input" />
      </label>
      {/* Hidden from people; spam bots fill it in */}
      <input name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" />
      {state && "error" in state && <p className="text-sm text-accent">{t.invalid}</p>}
      <button disabled={!rating || pending} className="w-full rounded-full bg-ink py-4 text-lg font-semibold text-white disabled:bg-line disabled:text-muted">
        {pending ? t.sending : t.sendReview}
      </button>
    </form>
  );
}
