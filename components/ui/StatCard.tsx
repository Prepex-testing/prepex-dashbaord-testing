import type { ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { Skeleton } from "@/components/ui/Skeleton";
import { ChevronRightIcon } from "@/components/ui/icons";

type StatCardProps = {
  label: string;
  value: string;
  icon: ReactNode;
  /** Small line under the value, e.g. "vs last month". */
  caption?: string;
  /** Swaps the value and caption for placeholders; the rest of the card stays put. */
  loading?: boolean;
  /** Turns the card into a link to the page this figure comes from. */
  href?: string;
};

/**
 * The dashboard's headline figures, laid out like the student app's Mock
 * Analysis cards: icon chip on the left, label / value / caption stacked
 * beside it.
 *
 * The chip uses the app's own `--tint` / `--ink` pairing, so both halves move
 * with the theme together — pale blue chip with a navy glyph in light, dark
 * navy chip with a cream glyph in dark.
 *
 * While loading, the card, its icon and its label all stay exactly where they
 * are; only the two lines that carry data become placeholders, so the figure
 * fades in without the layout shifting under it.
 */
export function StatCard({
  label,
  value,
  icon,
  caption,
  loading = false,
  href,
}: StatCardProps) {
  const card = (
    <>
      {/* Icon */}
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-tint text-ink">
        {icon}
      </span>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p className="h-4 truncate text-[11px] font-semibold leading-4 text-muted sm:text-[12px]">
          {label}
        </p>

        {loading ? (
          <span className="flex h-8 items-center">
            <Skeleton className="h-6 w-24 rounded-lg" />
          </span>
        ) : (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="h-8 truncate text-[22px] font-bold leading-8 tracking-normal text-ink sm:text-[24px]"
          >
            {value}
          </motion.p>
        )}

        {caption &&
          (loading ? (
            <span className="flex h-[19.5px] items-center pt-[3px]">
              <Skeleton className="h-3 w-32" />
            </span>
          ) : (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.05, ease: "easeOut" }}
              className="pt-[3px] text-[10px] font-bold leading-[16.5px] text-muted sm:text-[11px]"
            >
              {caption}
            </motion.p>
          ))}
      </div>

      {/* A chevron marks the cards that lead somewhere, so a linked card is
          distinguishable from a plain figure before you hover it. It nudges
          right on hover — the only thing that moves. */}
      {href && (
        <ChevronRightIcon className="h-5 w-5 shrink-0 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink" />
      )}
    </>
  );

  const shell =
    "flex min-h-[134.5px] w-full items-center gap-4 rounded-2xl border border-card bg-surface px-5 py-6 shadow-[0_4px_20px_rgba(0,0,0,0.03)] sm:px-6 sm:py-8";

  if (href) {
    // Hover lifts the card on its own shadow and firms up the border, leaving
    // the surface alone — tinting the whole card washed out the figure that is
    // the point of it.
    return (
      <Link
        href={href}
        className={`${shell} group transition-[box-shadow,border-color] duration-200 hover:border-brand/25 hover:shadow-hover`}
      >
        {card}
      </Link>
    );
  }

  return <div className={shell}>{card}</div>;
}
