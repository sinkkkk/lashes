"use client";
import { useActionState, useState } from "react";
import { StarInput } from "@/components/StarInput";
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
        <StarInput value={rating} onChange={setRating} />
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
