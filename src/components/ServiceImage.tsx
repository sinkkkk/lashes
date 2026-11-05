import { LashMark } from "./LashMark";

/** The service photo, or a soft placeholder until a photo is added in /admin. */
export function ServiceImage({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  if (src) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={`object-cover ${className}`} loading="lazy" />;
  }
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br from-blush to-sand ${className}`}>
      <LashMark className="h-1/3 w-1/2 text-rose/70" />
    </div>
  );
}
