"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDebouncedValue } from "@/lib/ui/useDebouncedValue";
import { rowLinkClick } from "@/lib/ui/rowLink";
import {
  SearchIcon,
  XIcon,
  ChevronRightIcon,
} from "@/components/ui/icons";
import {
  ACADEMIC_LEVELS,
  ACADEMIC_LEVEL_LABEL,
  STUDENT_STATUSES,
  formatLastActive,
  formatTimestamp,
  levelLabel,
} from "@/lib/users/directory";
import {
  listStudents,
  type AcademicLevel,
  type Student,
  type StudentListPage,
} from "@/lib/api/students";
import { listExams, type Exam } from "@/lib/api/overview";
import { ApiError } from "@/lib/api/http";

const PAGE_SIZE = 8;

const ALL = "all";

const LEVEL_OPTIONS = [
  { value: ALL, label: "All levels" },
  ...ACADEMIC_LEVELS.map((level) => ({
    value: level,
    label: ACADEMIC_LEVEL_LABEL[level],
  })),
];

const STATUS_OPTIONS = [
  { value: ALL, label: "All statuses" },
  ...STUDENT_STATUSES.map((status) => ({ value: status, label: status })),
];

/**
 * The student directory: search by name or email, narrow by
 * level/exam/status, then page through what's left.
 *
 * All of that happens server-side — GET /admin/students takes the search,
 * the filters and the page, and answers with one page of rows plus the
 * matching total. The browser never holds the whole directory, so the table
 * behaves the same at 24 students as at 24,000.
 */
export function StudentsTable() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState(ALL);
  const [exam, setExam] = useState(ALL);
  const [status, setStatus] = useState(ALL);
  const [page, setPage] = useState(1);

  // Each result and each failure is tagged with the request it answers, so
  // "still fetching" is derived by comparing tags rather than stored in a flag
  // an effect has to set. The last successful page also stays on screen while
  // the next one is in flight, which is what keeps the table from collapsing
  // to placeholders on every keystroke.
  const [loaded, setLoaded] = useState<{ key: string; data: StudentListPage } | null>(null);
  const [failed, setFailed] = useState<{ key: string; message: string } | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);

  // Typing filters on a pause rather than on every keystroke, so a request
  // isn't fired mid-word.
  const appliedQuery = useDebouncedValue(query, 250);

  // Identifies the request the current filters call for. Anything tagged with
  // a different key describes a request that has since been superseded.
  const requestKey = JSON.stringify({
    search: appliedQuery.trim(),
    level,
    exam,
    status,
    page,
  });

  const describeError = useCallback(
    (err: unknown) =>
      err instanceof ApiError
        ? err.message
        : "Could not load students. Check your connection and try again.",
    [],
  );

  // The exam filter is built from the exams dashboard-service has configured,
  // and filters by id because that is what a student's profile stores.
  useEffect(() => {
    const controller = new AbortController();
    listExams()
      .then((data) => {
        if (!controller.signal.aborted) setExams(data);
      })
      .catch(() => {
        // A missing exam list only costs the dropdown its options — the table
        // itself still works, so this isn't worth an error banner.
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    // Aborted on unmount, and on any filter change, so a slow response for
    // filters the admin has already moved on from is discarded rather than
    // overwriting the newer one.
    const controller = new AbortController();

    listStudents({
      page,
      limit: PAGE_SIZE,
      ...(appliedQuery.trim() && { search: appliedQuery.trim() }),
      ...(level !== ALL && { level: level as AcademicLevel }),
      ...(exam !== ALL && { examId: exam }),
      ...(status !== ALL && {
        status: status === "Active" ? ("active" as const) : ("inactive" as const),
      }),
    })
      .then((data) => {
        if (controller.signal.aborted) return;
        setLoaded({ key: requestKey, data });
        setFailed(null);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        // A 401 is handled by the request wrapper, which refreshes the token
        // or signs the admin out — showing a message here would be noise.
        if (err instanceof ApiError && err.status === 401) return;
        setFailed({ key: requestKey, message: describeError(err) });
      });

    return () => controller.abort();
  }, [appliedQuery, level, exam, status, page, requestKey, describeError]);

  const examOptions = [
    { value: ALL, label: "All exams" },
    ...exams.map((item) => ({ value: item.id, label: item.name })),
  ];

  // Only the very first load has nothing to show, so only it gets skeletons.
  // Swapping rows for placeholders on every search, filter and page change
  // made the table jump twice per interaction — out to eight placeholder rows,
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

  const hasFilters =
    query.trim() !== "" || level !== ALL || exam !== ALL || status !== ALL;

  const resetFilters = () => {
    setQuery("");
    setLevel(ALL);
    setExam(ALL);
    setStatus(ALL);
    setPage(1);
  };

  // Any filter change starts again from the first page: the page the admin is
  // on has no meaning against a different result set.
  const changeFilter = (set: (value: string) => void) => (value: string) => {
    set(value);
    setPage(1);
  };

  return (
    <Card className="p-0 sm:p-0">
      {/* Toolbar */}
      <div className="flex flex-col gap-4 border-b border-task-card-border px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-ink">Students</h2>
            {/* The heading is fixed; only the tally waits for data. */}
            {isLoading ? (
              <span className="mt-0.5 flex h-4 items-center">
                <Skeleton className="h-3 w-28" />
              </span>
            ) : (
              <p className="mt-0.5 text-xs text-muted">
                {total} {total === 1 ? "student" : "students"}
                {hasFilters ? " match these filters" : " registered"}
              </p>
            )}
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

        <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
          {/* Search — full width on its own row until xl, where it shares with the filters. */}
          <div className="flex h-11 w-full items-center gap-2 rounded-xl border border-input-border bg-surface px-3 shadow-input xl:max-w-[320px]">
            <span className="shrink-0 text-muted">
              <SearchIcon />
            </span>
            {/* The hint is the longest string in this row, so it sets its own
                size: 12px on a phone where the field is narrowest, stepping up
                with the field itself. Typed text scales alongside it. */}
            <input
              type="search"
              value={query}
              onChange={(event) => changeFilter(setQuery)(event.target.value)}
              placeholder="Search by name or email"
              aria-label="Search students"
              className="min-w-0 flex-1 bg-transparent text-[13px] font-medium text-ink outline-none placeholder:text-[12px] placeholder:font-normal placeholder:text-[#666666] sm:text-sm sm:placeholder:text-[13px] lg:placeholder:text-sm dark:placeholder:text-[#8B8998]"
            />
          </div>

          {/* Filters — one per row on phones, side by side from sm up. */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 xl:flex-1">
            <Select
              ariaLabel="Filter by level"
              options={LEVEL_OPTIONS}
              value={level}
              onChange={changeFilter(setLevel)}
            />
            <Select
              ariaLabel="Filter by exam"
              options={examOptions}
              value={exam}
              onChange={changeFilter(setExam)}
            />
            <Select
              ariaLabel="Filter by status"
              options={STATUS_OPTIONS}
              value={status}
              onChange={changeFilter(setStatus)}
            />
          </div>
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

      {/* Rows stay mounted across changes and simply dim while the next set
          is being fetched, so nothing remounts and the table holds its
          place. */}
      <div
        className={`transition-opacity duration-200 ${
          isRefetching ? "opacity-50" : "opacity-100"
        }`}
      >
        {/* Table on lg+, stacked cards below — same rows either way. */}
        <div className="admin-scroll-panel hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead>
              <tr className="border-b border-task-card-border">
                {[
                  "Student",
                  "Level",
                  "Exam",
                  "Streak",
                  "Status",
                  "Joined",
                ].map((heading) => (
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
                ? Array.from({ length: PAGE_SIZE }, (_, index) => (
                    <SkeletonTableRow key={`placeholder-${index}`} />
                  ))
                : rows.map((student) => (
                    <tr
                      key={student.id}
                      onClick={rowLinkClick(router, studentHref(student))}
                      className="cursor-pointer border-b border-task-card-border last:border-0 transition-colors hover:bg-tint-strong/60"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={student.name} />
                          <div className="min-w-0">
                            {/* The row is clickable; this link is its keyboard
                                and screen-reader equivalent. */}
                            <Link
                              href={studentHref(student)}
                              className="block truncate text-sm font-bold text-ink hover:underline focus-visible:underline"
                            >
                              {student.name}
                            </Link>
                            <p className="truncate text-xs text-muted">
                              {student.email}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-sm text-body-text">
                        {levelLabel(student.level)}
                      </td>
                      <td className="px-5 py-4 text-sm text-body-text">
                        {student.exam ?? "—"}
                      </td>
                      <td className="px-5 py-4 text-sm text-body-text">
                        {student.streak > 0 ? `${student.streak} days` : "—"}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge student={student} />
                      </td>
                      <td className="px-5 py-4 text-sm text-muted">
                        {formatTimestamp(student.joinedAt)}
                      </td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>

        <ul className="flex flex-col lg:hidden">
          {isLoading
            ? Array.from({ length: PAGE_SIZE }, (_, index) => (
                <SkeletonCardRow key={`placeholder-${index}`} />
              ))
            : rows.map((student) => (
                <li
                  key={student.id}
                  className="border-b border-task-card-border last:border-0"
                >
                  {/* The whole card is the link on a phone. A 32px icon is a
                      poor target on touch, and it left the name competing with
                      a badge and a button for the same row. */}
                  <Link
                    href={studentHref(student)}
                    className="flex flex-col gap-3 p-4 transition-colors active:bg-tint-strong/60 sm:p-5"
                  >
                    <div className="flex items-start gap-3">
                      <Avatar name={student.name} />

                      <div className="min-w-0 flex-1">
                        {/* Wraps instead of truncating, so the full name is
                            always readable. Past ~26 characters it no longer
                            fits one line on a narrow phone, so it steps down a
                            size at the point it would start wrapping rather
                            than shrinking names that were fitting fine. */}
                        <p
                          className={`font-bold break-words text-ink ${
                            student.name.length > 26 ? "text-[13px] leading-5" : "text-sm"
                          }`}
                        >
                          {student.name}
                        </p>
                        <p className="truncate text-xs text-muted">
                          {student.email}
                        </p>
                      </div>

                      <ChevronRightIcon className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <StatusBadge student={student} />
                      <span className="text-[11px] text-muted">
                        {levelLabel(student.level)}
                      </span>
                      {student.exam && (
                        <span className="text-[11px] text-muted">{student.exam}</span>
                      )}
                      {student.streak > 0 && (
                        <span className="text-[11px] text-muted">
                          {student.streak}-day streak
                        </span>
                      )}
                      <span className="text-[11px] text-muted">
                        Joined {formatTimestamp(student.joinedAt)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
          {!isLoading &&
            Array.from({ length: fillerRows }, (_, index) => (
              <li
                key={`filler-${index}`}
                aria-hidden="true"
                className="flex flex-col gap-3 border-b border-task-card-border p-4 last:border-0 sm:p-5"
              >
                <span className="block h-9" />
                <span className="block h-4" />
              </li>
            ))}
        </ul>
      </div>

      {/* "No students found" is a result, not a loading state — while
          placeholders are up the footer keeps its own placeholder instead, so
          an empty message never flashes on the way to real rows. */}
      {isLoading ? (
        <div className="flex items-center justify-center border-t border-task-card-border px-4 py-4 sm:px-6">
          <Skeleton className="h-3 w-44" />
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center gap-2 px-5 py-16 text-center">
          <p className="text-sm font-bold text-ink">No students found</p>
          <p className="max-w-[320px] text-xs text-muted">
            {hasFilters
              ? "Nothing matches this search and filter combination. Try clearing them to see everyone."
              : "No students have registered on prepex yet."}
          </p>
        </div>
      ) : (
        <Pagination
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
          summary={`Showing ${firstShown}–${lastShown} of ${total} students`}
        />
      )}
    </Card>
  );
}

/**
 * A stand-in row matching the real one column for column, so the table holds
 * its widths and height while data loads and nothing shifts when it arrives.
 */
function SkeletonTableRow() {
  return (
    <tr className="border-b border-task-card-border last:border-0">
      <td className="px-5 py-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 shrink-0" />
          <div className="flex min-w-0 flex-col gap-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
        </div>
      </td>
      <td className="px-5 py-4">
        <Skeleton className="h-3.5 w-20" />
      </td>
      <td className="px-5 py-4">
        <Skeleton className="h-3.5 w-24" />
      </td>
      <td className="px-5 py-4">
        <Skeleton className="h-3.5 w-14" />
      </td>
      <td className="px-5 py-4">
        <Skeleton className="h-6 w-16 rounded-full" />
      </td>
      <td className="px-5 py-4">
        <Skeleton className="h-3.5 w-24" />
      </td>
    </tr>
  );
}

/** The same stand-in for the stacked card layout used below `lg`. */
function SkeletonCardRow() {
  return (
    <li className="flex flex-col gap-3 border-b border-task-card-border p-4 last:border-0 sm:p-5">
      <div className="flex items-start gap-3">
        <Skeleton className="h-9 w-9 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Skeleton className="h-3.5 w-32 max-w-full" />
          <Skeleton className="h-3 w-44 max-w-full" />
        </div>
        <Skeleton className="mt-0.5 h-4 w-4 shrink-0 rounded" />
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <Skeleton className="h-6 w-16 rounded-full" />
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-20" />
      </div>
    </li>
  );
}

function Avatar({ name }: { name: string }) {
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#171658] text-xs font-bold text-white dark:bg-[#FAF7F2] dark:text-[#171658]">
      {name[0]?.toUpperCase() ?? "S"}
    </span>
  );
}

function StatusBadge({ student }: { student: Student }) {
  return (
    // The last-seen time is what the status is derived from, so it's the
    // tooltip rather than a column of its own.
    <span title={`Last seen ${formatLastActive(student.lastActiveAt)}`}>
      <Badge tone={student.status === "Active" ? "success" : "neutral"}>
        {student.status}
      </Badge>
    </span>
  );
}

/** The student's own page, where the full onboarding profile lives. */
function studentHref(student: Student) {
  return `/users/${student.id}`;
}
