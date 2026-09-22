"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/PageHeader";
import { Skeleton } from "@/components/ui/Skeleton";
import { ChevronRightIcon } from "@/components/ui/icons";
import { RESOURCE_TYPES } from "@/lib/resources/catalog";
import { RESOURCE_TYPE_ICONS } from "@/components/resources/typeIcons";
import { getContentCounts, type ContentCounts } from "@/lib/api/content";
import { ApiError } from "@/lib/api/http";

/**
 * One row per content type. Picking a row opens that type, where the rows are
 * split by subject.
 *
 * The four types are fixed, so their icons, names and descriptions render
 * straight away — only each row's item count waits for
 * GET /admin/content-counts.
 */
export default function ResourcesPage() {
  const [counts, setCounts] = useState<ContentCounts | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    getContentCounts()
      .then((data) => {
        if (!controller.signal.aborted) setCounts(data);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        // A 401 is handled by the request wrapper.
        if (err instanceof ApiError && err.status === 401) return;
        setError(
          err instanceof ApiError
            ? err.message
            : "Could not load the library totals. Check your connection and try again.",
        );
      });

    return () => controller.abort();
  }, []);

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Resources"
        subtitle="Study material available to students, grouped by content type."
      />

      {error && (
        <p
          role="alert"
          className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
        >
          {error}
        </p>
      )}

      <div className="flex flex-col gap-3">
        {RESOURCE_TYPES.map((type) => {
          const Icon = RESOURCE_TYPE_ICONS[type.icon];
          const total = counts?.[type.countKey];

          return (
            // Hover lifts the row on its own shadow and firms up the border,
            // leaving the surface alone — tinting the whole row washed out the
            // name and count that are the point of it. Same treatment as the
            // dashboard's linked stat cards.
            <Link
              key={type.slug}
              href={`/resources/${type.slug}`}
              className="group flex items-center gap-4 rounded-2xl border border-task-card-border bg-card p-4 shadow-quick-access transition-[box-shadow,border-color] duration-200 hover:border-brand/25 hover:shadow-hover sm:gap-5 sm:p-5"
            >
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-icon-chip-bg text-ink dark:text-[#1a1a4e] sm:h-14 sm:w-14">
                <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
              </span>

              <div className="min-w-0 flex-1">
                <h2 className="text-[16px] font-bold leading-6 text-ink sm:text-[18px]">
                  {type.label}
                </h2>
                <p className="mt-0.5 text-[12px] leading-5 text-muted sm:text-[14px]">
                  {type.description}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-3 sm:gap-4">
                {/* Only the tally waits — the "Items" caption below it is
                    fixed, so the column keeps its shape while loading. */}
                <div className="text-right">
                  <div className="flex h-5 items-center justify-end sm:h-6">
                    {total === undefined ? (
                      <Skeleton className="h-4 w-12 rounded sm:h-5 sm:w-14" />
                    ) : (
                      <p className="text-[16px] font-extrabold leading-none text-ink sm:text-[20px]">
                        {total.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
                    Items
                  </p>
                </div>
                {/* The chevron nudges right on hover — the only thing that moves. */}
                <ChevronRightIcon className="h-5 w-5 text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ink" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
