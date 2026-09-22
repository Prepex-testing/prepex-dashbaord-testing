"use client";

import { motion } from "motion/react";

export type StackedBarSegment = {
  label: string;
  value: number;
};

type StackedBarProps = {
  segments: StackedBarSegment[];
  ariaLabel: string;
};

/**
 * Part-to-whole across a small set of named categories, as one horizontal bar
 * with a legend beneath it.
 *
 * Colour carries identity here, so the three hues come from the validated
 * categorical set in fixed order — slot 1 always goes to the first segment,
 * whatever its size, so a series never changes colour when the data shifts.
 * Every segment is also directly labelled in the legend with its count and
 * share, which is what makes the palette safe at its tritan floor: nobody has
 * to tell two segments apart by colour alone.
 */
const SERIES_VARS = ["var(--series-1)", "var(--series-2)", "var(--series-3)"];

export function StackedBar({ segments, ariaLabel }: StackedBarProps) {
  const total = segments.reduce((sum, segment) => sum + segment.value, 0) || 1;

  return (
    <div className="flex flex-col gap-4">
      {/* A 2px surface gap between fills separates the segments — a border
          drawn around each one would thicken the bar and muddy the colours. */}
      <div
        className="flex h-3 w-full gap-[2px] overflow-hidden rounded-full"
        role="img"
        aria-label={ariaLabel}
      >
        {segments.map((segment, index) => (
          <motion.span
            key={segment.label}
            className="h-full first:rounded-l-full last:rounded-r-full"
            style={{ backgroundColor: SERIES_VARS[index % SERIES_VARS.length] }}
            initial={{ width: 0 }}
            animate={{ width: `${(segment.value / total) * 100}%` }}
            transition={{ duration: 0.5, delay: index * 0.06, ease: "easeOut" }}
          />
        ))}
      </div>

      <ul className="flex flex-col gap-2.5">
        {segments.map((segment, index) => (
          <li key={segment.label} className="flex items-center gap-2.5">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: SERIES_VARS[index % SERIES_VARS.length] }}
            />
            {/* Text stays in the theme's own ink — the swatch beside it is what
                carries identity, never the label's colour. */}
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-ink">
              {segment.label}
            </span>
            <span className="shrink-0 text-[13px] font-bold text-ink tabular-nums">
              {segment.value.toLocaleString()}
            </span>
            <span className="w-10 shrink-0 text-right text-[12px] text-muted tabular-nums">
              {Math.round((segment.value / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
