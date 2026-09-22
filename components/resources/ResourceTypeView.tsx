"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { SearchIcon, XIcon, PlusIcon } from "@/components/ui/icons";
import { AddResourceModal } from "@/components/resources/AddResourceModal";
import { RESOURCE_TYPE_ICONS } from "@/components/resources/typeIcons";
import { useDebouncedValue } from "@/lib/ui/useDebouncedValue";
import { rowLinkClick } from "@/lib/ui/rowLink";
import { getResourceType, type Cell } from "@/lib/resources/catalog";
import {
  listContent,
  type ContentPage,
  type QuestionRow,
  type ResourceRow,
} from "@/lib/api/content";
import { listSubjects, type Subject } from "@/lib/api/overview";
import { ApiError } from "@/lib/api/http";

const PAGE_SIZE = 5;

const ALL = "all";

/** How many stand-in rows to hold while the list loads. */
const PLACEHOLDER_ROWS = PAGE_SIZE;

/**
 * One content type, searchable and filterable by subject. The table columns
 * come from the type, so all four types share this one screen.
 *
 * Searching, filtering and paging happen server-side — GET /admin/content
 * takes the type, the subject, the search and the page, and answers with one
 * page of rows plus the matching total. The type's name, description, column
 * headings, the toolbar and the Add button are all fixed, so they render
 * straight away; only the rows and the tallies beside them wait for data.
 */
export function ResourceTypeView({ slug }: { slug: string }) {
  // Looked up here rather than handed in as a prop: the definition carries a
  // `toCells` function, which can't be serialised from a Server Component.
  // The route has already rejected unknown slugs, so this always resolves.
  const type = getResourceType(slug)!;
  const router = useRouter();

  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState<string>(ALL);
  const [page, setPage] = useState(1);
  const [isAddOpen, setAddOpen] = useState(false);

  // Each result and each failure is tagged with the request it answers, so
  // "still fetching" is derived by comparing tags rather than stored in a flag
  // an effect has to set. The last successful page also stays on screen while
  // the next one is in flight, which keeps the table from collapsing to
  // placeholders on every keystroke.
  const [loaded, setLoaded] = useState<{
    key: string;
    data: ContentPage<ResourceRow | QuestionRow>;
  } | null>(null);
  const [failed, setFailed] = useState<{ key: string; message: string } | null>(null);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  // Bumped after a successful upload, to re-run the fetch below and show the
  // rows that just landed.
  const [reloadToken, setReloadToken] = useState(0);

  const Icon = RESOURCE_TYPE_ICONS[type.icon];

  // Typing filters on a pause rather than on every keystroke, so a request
  // isn't fired mid-word.
  const appliedQuery = useDebouncedValue(query, 250);

  // Identifies the request the current filters call for. Anything tagged with
  // a different key describes a request that has since been superseded.
  const requestKey = JSON.stringify({
    contentType: type.contentType,
    search: appliedQuery.trim(),
    subject,
    page,
    reloadToken,
  });

  const describeError = useCallback(
    (err: unknown) =>
      err instanceof ApiError
        ? err.message
        : "Could not load this list. Check your connection and try again.",
    [],
  );

  useEffect(() => {
    const controller = new AbortController();
    listSubjects()
      .then((data) => {
        if (!controller.signal.aborted) setSubjects(data);
      })
      .catch(() => {
        // A missing subject list only costs the dropdown its options — the
        // table still works, so this isn't worth an error banner.
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    // Aborted on unmount, and on any filter change, so a slow response for
    // filters the admin has already moved on from is discarded rather than
    // overwriting the newer one.
    const controller = new AbortController();

    listContent({
      contentType: type.contentType,
      page,
      limit: PAGE_SIZE,
      ...(appliedQuery.trim() && { search: appliedQuery.trim() }),
      ...(subject !== ALL && { subjectId: Number(subject) }),
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        setLoaded({ key: requestKey, data });
        setFailed(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        // A 401 is handled by the request wrapper.
        if (err instanceof ApiError && err.status === 401) return;
        setFailed({ key: requestKey, message: describeError(err) });
      });

    return () => controller.abort();
  }, [type.contentType, appliedQuery, subject, page, requestKey, describeError]);

  const subjectOptions = [
    { value: ALL, label: "All subjects" },
    ...subjects.map((item) => ({ value: String(item.id), label: item.name })),
  ];

  // Only the very first load has nothing to show, so only it gets skeletons.
  // Swapping rows for placeholders on every search, filter and page change
  // made the table jump twice per interaction — out to five placeholder rows,
  // then back to however many the new page holds. Instead the rows already on
  // screen are held at reduced opacity until the new ones are ready.
  const isLoading = loaded === null && failed === null;
  const isSettled = loaded?.key === requestKey || failed?.key === requestKey;
  const isRefetching = loaded !== null && !isSettled;

  // A stale failure is kept off screen while a newer request is in flight —
  // the rows beside it belong to a request that did succeed.
  const error = failed?.key === requestKey ? failed.message : null;

  const total = loaded?.data.total ?? 0;
  const rows = loaded?.data.items ?? [];
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  // A last page with fewer rows would otherwise shorten the table and pull the
  // pagination up with it, so it's padded out to a full page.
  const fillerRows = pageCount > 1 ? PAGE_SIZE - rows.length : 0;
  const firstShown = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const lastShown = Math.min(page * PAGE_SIZE, total);

  const hasFilters = query.trim() !== "" || subject !== ALL;

  const resetFilters = () => {
    setQuery("");
    setSubject(ALL);
    setPage(1);
  };

  // Any filter change starts again from the first page.
  const changeFilter = (set: (value: string) => void) => (value: string) => {
    set(value);
    setPage(1);
  };

  const unit = total === 1 ? type.singular.toLowerCase() : type.label.toLowerCase();

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Back arrow sits beside the title, and the primary action sits at the
          page's top-right — outside the table it adds to. */}
      <PageHeader
        title={type.label}
        subtitle={type.description}
        backHref="/resources"
      >
        {/* Below sm the header row is already carrying a back arrow, the
            title, the theme toggle and the profile menu — a fifth control
            leaves the title almost no width, so Add drops to its own
            full-width row underneath instead of shrinking to "Add". */}
        <div className="hidden sm:block">
          <Button
            variant="primary"
            size="sm"
            className="shrink-0"
            onClick={() => setAddOpen(true)}
          >
            <PlusIcon />
            Add Resource
          </Button>
        </div>
      </PageHeader>

      <div className="sm:hidden">
        <Button
          variant="primary"
          size="sm"
          className="w-full"
          onClick={() => setAddOpen(true)}
        >
          <PlusIcon />
          Add Resource
        </Button>
      </div>

      <Card className="p-0 sm:p-0">
        {/* Toolbar: search on the left, subject on the right. */}
        <div className="flex flex-col gap-4 border-b border-task-card-border px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-tint text-ink sm:h-10 sm:w-10">
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-ink">{type.label}</h2>
                {isLoading ? (
                  <span className="mt-0.5 flex h-4 items-center">
                    <Skeleton className="h-3 w-24" />
                  </span>
                ) : (
                  <p className="mt-0.5 text-xs text-muted">
                    {total.toLocaleString()} {unit}
                    {hasFilters ? " match these filters" : " in the library"}
                  </p>
                )}
              </div>
            </div>

            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="flex items-center gap-1.5 text-xs font-semibold text-brand transition-colors hover:opacity-80"
              >
                <XIcon className="h-3 w-3" />
                Clear filters
              </button>
            )}
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-11 w-full min-w-0 items-center gap-2 rounded-xl border border-input-border bg-surface px-3 shadow-input sm:flex-1">
              <span className="shrink-0 text-muted">
                <SearchIcon />
              </span>
              <input
                type="search"
                value={query}
                onChange={(event) => changeFilter(setQuery)(event.target.value)}
                placeholder={`Search ${type.label.toLowerCase()}`}
                aria-label={`Search ${type.label.toLowerCase()}`}
                className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none placeholder:font-normal placeholder:text-[#666666] dark:placeholder:text-[#8B8998]"
              />
            </div>

            <Select
              ariaLabel="Filter by subject"
              options={subjectOptions}
              value={subject}
              onChange={changeFilter(setSubject)}
              className="sm:w-48 sm:shrink-0"
            />
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="border-b border-task-card-border bg-danger-bg px-4 py-3 text-xs font-medium text-danger sm:px-6"
          >
            {error}
          </p>
        )}

        {/* Table on lg+, stacked cards below — same rows either way. */}
        <div
          className={`admin-scroll-panel hidden overflow-x-auto transition-opacity duration-200 lg:block ${isRefetching ? "opacity-50" : "opacity-100"}`}
        >
          <table className="w-full min-w-[820px] border-collapse text-left">
            <thead>
              <tr className="border-b border-task-card-border">
                {type.columns.map((heading) => (
                  <th
                    key={heading}
                    scope="col"
                    className="px-5 py-4 text-[11px] font-bold uppercase tracking-[0.08em] text-muted"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => (
                    <SkeletonTableRow
                      key={`placeholder-${index}`}
                      columns={type.columns.length}
                    />
                  ))
                : rows.map((row) => {
                    const href = chapterHref(type.slug, row);
                    return (
                      <tr
                        key={row.id}
                        onClick={href ? rowLinkClick(router, href) : undefined}
                        className={`border-b border-task-card-border transition-colors last:border-0 hover:bg-tint-strong/60 ${href ? "cursor-pointer" : ""}`}
                      >
                        {type.toCells(row).map((cell, cellIndex) => (
                          <td
                            key={`${row.id}-${cellIndex}`}
                            className={
                              cellIndex === 0
                                ? "max-w-[360px] px-5 py-4 text-sm font-bold text-ink"
                                : "px-5 py-4 text-sm text-body-text"
                            }
                          >
                            {/* The row is clickable; this link is its keyboard
                                and screen-reader equivalent. */}
                            {cellIndex === 0 && href ? (
                              <Link href={href} className="block truncate hover:underline focus-visible:underline">
                                <CellValue cell={cell} />
                              </Link>
                            ) : (
                              <CellValue cell={cell} truncate={cellIndex === 0} />
                            )}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
              {!isLoading &&
                Array.from({ length: fillerRows }, (_, index) => (
                  <tr
                    key={`filler-${index}`}
                    aria-hidden="true"
                    className="border-b border-task-card-border last:border-0"
                  >
                    <td colSpan={type.columns.length} className="px-5 py-4">
                      <span className="block h-5" />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        <ul
          className={`flex flex-col transition-opacity duration-200 lg:hidden ${isRefetching ? "opacity-50" : "opacity-100"}`}
        >
          {isLoading
            ? Array.from({ length: PLACEHOLDER_ROWS }, (_, index) => (
                <SkeletonCardRow key={`placeholder-${index}`} />
              ))
            : rows.map((row) => {
                const cells = type.toCells(row);
                const href = chapterHref(type.slug, row);
                const cardClass =
                  "flex flex-col gap-2.5 p-4 sm:gap-3 sm:p-5";
                const body = (
                  <>
                    {/* No truncation here — the title is the row's whole point
                        on a card, so it wraps to as many lines as it needs. */}
                    <p className="text-[13px] leading-5 font-bold break-words text-ink sm:text-sm">
                      <CellValue cell={cells[0]} />
                    </p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted">
                      {cells.slice(1).map((cell, cellIndex) => (
                        <span
                          key={`${row.id}-m-${cellIndex}`}
                          className="flex items-center"
                        >
                          <CellValue cell={cell} />
                        </span>
                      ))}
                    </div>
                  </>
                );
                // The whole card is the link on a phone, as on Users.
                return (
                  <li key={row.id} className="border-b border-task-card-border last:border-0">
                    {href ? (
                      <Link href={href} className={`${cardClass} transition-colors active:bg-tint-strong/60`}>
                        {body}
                      </Link>
                    ) : (
                      <div className={cardClass}>{body}</div>
                    )}
                  </li>
                );
              })}
          {!isLoading &&
            Array.from({ length: fillerRows }, (_, index) => (
              <li
                key={`filler-${index}`}
                aria-hidden="true"
                className="flex flex-col gap-2.5 border-b border-task-card-border p-4 last:border-0 sm:gap-3 sm:p-5"
              >
                <span className="block h-5" />
                <span className="block h-4" />
              </li>
            ))}
        </ul>

        {/* An empty result is a result, not a loading state — while
            placeholders are up the footer keeps its own placeholder instead,
            so an empty message never flashes on the way to real rows. */}
        {isLoading ? (
          <div className="flex items-center justify-center border-t border-task-card-border px-4 py-4 sm:px-6">
            <Skeleton className="h-3 w-44" />
          </div>
        ) : total === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
            <p className="text-sm font-bold text-ink">
              No {type.label.toLowerCase()} found
            </p>
            <p className="max-w-[320px] text-xs text-muted">
              {hasFilters
                ? "Nothing matches this search and filter combination. Try clearing them."
                : "Nothing here yet. Use Add Resource to upload a bank file."}
            </p>
          </div>
        ) : (
          <Pagination
            page={page}
            pageCount={pageCount}
            onPageChange={setPage}
            summary={`Showing ${firstShown}–${lastShown} of ${total.toLocaleString()} ${unit}`}
          />
        )}
      </Card>

      <AddResourceModal
        open={isAddOpen}
        onClose={() => setAddOpen(false)}
        type={type}
        onUploaded={() => {
          // Back to the first page: an import writes newest-first rows, which
          // is exactly what page 1 shows.
          setPage(1);
          setReloadToken((token) => token + 1);
        }}
      />
    </div>
  );
}

/**
 * A stand-in row matching the real one column for column, so the table holds
 * its widths and height while data loads and nothing shifts when it arrives.
 * The first column is the wide one in every type, so it gets the wider bar.
 */
function SkeletonTableRow({ columns }: { columns: number }) {
  return (
    <tr className="border-b border-task-card-border last:border-0">
      {Array.from({ length: columns }, (_, index) => (
        <td key={index} className="px-5 py-4">
          <Skeleton
            className={index === 0 ? "h-3.5 w-56 max-w-full" : "h-3.5 w-20"}
          />
        </td>
      ))}
    </tr>
  );
}

/** The same stand-in for the stacked card layout used below `lg`. */
function SkeletonCardRow() {
  return (
    <li className="flex flex-col gap-2.5 border-b border-task-card-border p-4 last:border-0 sm:gap-3 sm:p-5">
      <Skeleton className="h-3.5 w-64 max-w-full" />

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    </li>
  );
}

function CellValue({
  cell,
  truncate = false,
}: {
  cell: Cell | undefined;
  truncate?: boolean;
}) {
  if (cell === undefined) return null;
  if (typeof cell === "string") {
    return (
      <span className={truncate ? "block truncate" : undefined}>{cell}</span>
    );
  }
  return <Badge tone={cell.tone}>{cell.badge}</Badge>;
}

/**
 * The chapter page a row opens, with the row's own id as the hash so that page
 * scrolls to and highlights it. Null for a resource with no chapter.
 */
function chapterHref(slug: string, row: ResourceRow | QuestionRow): string | null {
  if (!row.chapter) return null;
  return `/resources/${slug}/${row.chapter.id}#${row.id}`;
}
