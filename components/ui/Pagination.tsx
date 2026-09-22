"use client";

import { ChevronRightIcon } from "@/components/ui/icons";

type PaginationProps = {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Summary line, e.g. "Showing 1–8 of 24 students". */
  summary: string;
};

export function Pagination({ page, pageCount, onPageChange, summary }: PaginationProps) {
  if (pageCount <= 1) {
    return (
      <div className="flex items-center justify-center border-t border-task-card-border px-4 py-4 sm:px-6">
        <p className="text-caption text-muted">{summary}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 border-t border-task-card-border px-4 py-4 sm:px-6 md:flex-row md:justify-between">
      <p className="text-caption text-muted">{summary}</p>

      <div className="flex items-center gap-1">
        <PageArrow
          label="Previous page"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          direction="left"
        />

        {pageNumbers(page, pageCount).map((entry, index) =>
          entry === "gap" ? (
            <span key={`gap-${index}`} className="px-1 text-sm text-muted">
              …
            </span>
          ) : (
            <button
              key={entry}
              type="button"
              aria-label={`Page ${entry}`}
              aria-current={entry === page ? "page" : undefined}
              onClick={() => onPageChange(entry)}
              className={`h-9 min-w-9 rounded-lg px-2 text-sm font-semibold transition-colors ${
                entry === page
                  ? "bg-brand text-white"
                  : "text-muted hover:bg-tint-strong hover:text-ink"
              }`}
            >
              {entry}
            </button>
          ),
        )}

        <PageArrow
          label="Next page"
          disabled={page === pageCount}
          onClick={() => onPageChange(page + 1)}
          direction="right"
        />
      </div>
    </div>
  );
}

function PageArrow({
  label,
  disabled,
  onClick,
  direction,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  direction: "left" | "right";
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-sidebar-border text-muted transition-colors hover:bg-tint-strong hover:text-ink disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent"
    >
      <ChevronRightIcon className={`h-4 w-4 ${direction === "left" ? "rotate-180" : ""}`} />
    </button>
  );
}

/**
 * Page numbers with the current page always visible: first, last, the current
 * page and its neighbours, with "gap" standing in for whatever is skipped. Up
 * to 7 slots, so the row never outgrows a phone.
 */
function pageNumbers(page: number, pageCount: number): (number | "gap")[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  const entries: (number | "gap")[] = [1];

  const start = Math.max(2, page - 1);
  const end = Math.min(pageCount - 1, page + 1);

  if (start > 2) entries.push("gap");
  for (let n = start; n <= end; n++) entries.push(n);
  if (end < pageCount - 1) entries.push("gap");

  entries.push(pageCount);
  return entries;
}
