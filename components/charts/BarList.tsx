"use client";

import { motion } from "motion/react";

export type BarListItem = {
  label: string;
  value: number;
  /** Shown at the row's right edge; defaults to the raw value. */
  display?: string;
};

type BarListProps = {
  items: BarListItem[];
  /** Screen-reader name for the whole figure. */
  ariaLabel: string;
};

/**
 * The student app's own meter treatment: a navy→violet gradient on a near-white
 * `--tint` track, with the lighter stop at the bar's data end.
 *
 * Dark mode keeps that structure in cream but held below full strength, for
 * the same reason as the column chart — solid `#FAF7F2` glares at 16.5:1
 * against the dark card. Matched to the columns so both charts read as one
 * treatment.
 */
const BAR_CLASS =
  "bg-[linear-gradient(90.08deg,#1A1A4E_0.48%,#4C1D95_99.05%)] dark:bg-[linear-gradient(90.08deg,rgba(250,247,242,0.42)_0.48%,rgba(250,247,242,0.72)_99.05%)]";

/**
 * Horizontal bars for comparing magnitude across a handful of named
 * categories.
 *
 * Every bar is the same fill: length already carries the value, so shading bars
 * darker-where-bigger would double-encode it and spend the one free channel on
 * nothing. Each row is directly labelled with its own value, so the figure
 * needs no axis, no legend and no tooltip to be readable.
 */
export function BarList({ items, ariaLabel }: BarListProps) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <ul className="flex flex-col gap-4" aria-label={ariaLabel}>
      {items.map((item, index) => (
        <li key={item.label}>
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 truncate text-[13px] font-semibold text-ink">
              {item.label}
            </span>
            <span className="shrink-0 text-[13px] font-bold text-ink tabular-nums">
              {item.display ?? item.value.toLocaleString()}
            </span>
          </div>

          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-tint">
            <motion.div
              className={`h-full rounded-full ${BAR_CLASS}`}
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ duration: 0.5, delay: index * 0.05, ease: "easeOut" }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
