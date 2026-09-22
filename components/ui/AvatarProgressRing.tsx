import { useId } from "react";

type AvatarProgressRingProps = {
  /** Profile completion, 0–100 — how far round the ring is drawn. */
  percent: number;
  initials: string;
  /** Profile photo; the initials show when absent. */
  imageUrl?: string | null;
};

/**
 * The student's photo inside a completion ring, as the app draws it on its own
 * profile page. Read-only here — the admin views a student, it doesn't edit
 * them — so there's no camera badge.
 */
export function AvatarProgressRing({
  percent,
  initials,
  imageUrl = null,
}: AvatarProgressRingProps) {
  const size = 93;
  const strokeWidth = 5;
  const center = size / 2;
  const radius = center - strokeWidth / 2;
  const circumference = 2 * Math.PI * radius;
  const gradientId = useId();

  return (
    <div className="relative h-23.25 w-23.25">
      <svg viewBox={`0 0 ${size} ${size}`} className="absolute inset-0 h-full w-full -rotate-90">
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-tint-strong"
        />
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={`url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - percent / 100)}
        />

        {/* Light mode: navy → violet gradient. Dark mode: both stops turn
            cream, so the ring reads as a solid --ink stroke. */}
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" className="[stop-color:#1A1A4E] dark:[stop-color:#FAF7F2]" />
            <stop offset="100%" className="[stop-color:#4C1D95] dark:[stop-color:#FAF7F2]" />
          </linearGradient>
        </defs>
      </svg>

      <span className="absolute inset-0 m-auto flex h-18 w-18 items-center justify-center overflow-hidden rounded-full bg-tint text-[32px] font-bold leading-10 text-ink">
        {imageUrl ? (
          // A plain <img>: profile photos are served by the API, which isn't in
          // next.config's image allowlist, and it's already sized for display.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          initials
        )}
      </span>
    </div>
  );
}
