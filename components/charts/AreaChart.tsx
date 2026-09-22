"use client";

import { useId, useState } from "react";
import { niceScale } from "@/lib/charts/scale";

export type AreaChartPoint = {
  /** Short axis label, e.g. "Mon" or "12 Sep". */
  label: string;
  /** Full label for the readout, e.g. "Mon 15 Sep". */
  fullLabel?: string;
  value: number;
};

type AreaChartProps = {
  points: AreaChartPoint[];
  /** Names the measure in the readout, e.g. "Active students". */
  seriesLabel: string;
  ariaLabel: string;
};

/**
 * A single-series trend drawn as a jagged line over a filled slope.
 *
 * Only the line and its fill are SVG; every label is ordinary HTML beside it.
 * That split is deliberate — text inside a scaled `viewBox` scales with the
 * drawing, which is what made the axis numbers balloon on a wide card and
 * vanish on a phone. The plot uses a 0–100 coordinate space stretched to fit
 * (`preserveAspectRatio="none"`), with `vector-effect="non-scaling-stroke"` so
 * the line stays a crisp 2px at any width.
 */
export function AreaChart({ points, seriesLabel, ariaLabel }: AreaChartProps) {
  const gradientId = useId();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const { max, ticks } = niceScale(Math.max(...points.map((p) => p.value), 1));

  // Percentages, so the same numbers drive both the SVG path and the HTML
  // overlay that sits on top of it.
  const xAt = (index: number) =>
    points.length === 1 ? 50 : (index / (points.length - 1)) * 100;
  const yAt = (value: number) => (1 - Math.min(value, max) / max) * 100;

  const line = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${xAt(index)} ${yAt(point.value)}`)
    .join(" ");
  const area = `${line} L100 100 L0 100 Z`;

  // Show roughly six x labels however many points there are, so a 30-day range
  // doesn't crush thirty dates into the axis.
  const labelStep = Math.max(1, Math.ceil(points.length / 6));
  const active = activeIndex === null ? null : points[activeIndex];

  return (
    <div className="w-full">
      <div className="flex gap-2 sm:gap-3">
        {/* Y axis — real HTML text, so it stays 10–11px at every card width.
            Each tick is placed at its own percentage and pulled up half its own
            height, so it lines up with its gridline exactly. */}
        <div className="relative h-45 w-8 shrink-0 sm:w-10">
          {ticks.map((tick, index) => (
            <span
              key={tick}
              className="absolute right-0 -translate-y-1/2 text-[10px] leading-none text-muted tabular-nums sm:text-[11px]"
              style={{ top: `${(index / (ticks.length - 1)) * 100}%` }}
            >
              {tick.toLocaleString()}
            </span>
          ))}
        </div>

        <div className="min-w-0 flex-1">
          <div className="relative h-45">
            {/* Gridlines — solid hairlines, one shade off the surface. */}
            {ticks.map((tick, index) => (
              <div
                key={tick}
                aria-hidden="true"
                className="absolute inset-x-0 h-px bg-chart-grid"
                style={{
                  top: `${(index / (ticks.length - 1)) * 100}%`,
                  transform: "translateY(-0.5px)",
                }}
              />
            ))}

            {/* overflow-visible so a peak sitting on the top gridline isn't
                clipped through the middle of its own stroke. */}
            <svg
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              className="absolute inset-0 h-full w-full overflow-visible"
              role="img"
              aria-label={ariaLabel}
            >
              <defs>
                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--series-solo)" stopOpacity={0.32} />
                  <stop offset="100%" stopColor="var(--series-solo)" stopOpacity={0.02} />
                </linearGradient>
              </defs>

              <path d={area} fill={`url(#${gradientId})`} />
              <path
                d={line}
                fill="none"
                stroke="var(--series-solo)"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/* Crosshair and marker are HTML, so they keep a fixed size while
                the plot behind them stretches. */}
            {activeIndex !== null && (
              <>
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 w-px bg-muted/50"
                  style={{ left: `${xAt(activeIndex)}%` }}
                />
                <span
                  aria-hidden="true"
                  className="absolute h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface"
                  style={{
                    left: `${xAt(activeIndex)}%`,
                    top: `${yAt(points[activeIndex].value)}%`,
                    backgroundColor: "var(--series-solo)",
                  }}
                />
              </>
            )}

            {/* Hit areas — one full-height column per point, so the target is
                the column rather than the 10px marker. */}
            <div className="absolute inset-0 flex">
              {points.map((point, index) => (
                <button
                  key={`${point.label}-hit-${index}`}
                  type="button"
                  className="h-full min-w-0 flex-1"
                  aria-label={`${point.fullLabel ?? point.label}: ${point.value.toLocaleString()} ${seriesLabel.toLowerCase()}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseLeave={() => setActiveIndex(null)}
                  onFocus={() => setActiveIndex(index)}
                  onBlur={() => setActiveIndex(null)}
                />
              ))}
            </div>
          </div>

          {/* X axis — the thinned-out labels keep their slot but render empty
              rather than collapsing and shifting the rest. */}
          <div className="mt-2 flex">
            {points.map((point, index) => (
              <span
                key={`${point.label}-x-${index}`}
                className={`min-w-0 flex-1 truncate text-center text-[9px] leading-tight sm:text-[10px] ${
                  activeIndex === index ? "font-bold text-ink" : "text-muted"
                }`}
              >
                {index % labelStep === 0 || index === points.length - 1
                  ? point.label
                  : ""}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Readout. Plain markup rather than a floating tooltip: it stays
          readable on touch, where there is no hover. The row is always
          rendered so the card doesn't resize when a value appears. */}
      <div className="mt-4 flex h-9 items-center gap-2 overflow-hidden rounded-xl bg-tint-strong px-3 sm:gap-3 sm:px-4">
        {active ? (
          <>
            <span className="shrink-0 text-[11px] font-bold text-ink sm:text-[12px]">
              {active.fullLabel ?? active.label}
            </span>
            <span className="min-w-0 truncate text-[11px] text-muted sm:text-[12px]">
              {seriesLabel}:{" "}
              <span className="font-semibold text-ink tabular-nums">
                {active.value.toLocaleString()}
              </span>
            </span>
          </>
        ) : (
          <span className="truncate text-[11px] text-muted sm:text-[12px]">
            Hover the line for a day&apos;s exact figure
          </span>
        )}
      </div>
    </div>
  );
}
