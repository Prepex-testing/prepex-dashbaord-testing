"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion } from "motion/react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { AvatarProgressRing } from "@/components/ui/AvatarProgressRing";
import { MailIcon, PhoneIcon } from "@/components/ui/icons";
import {
  QuickIcon,
  Coaching,
  GraduationCapIcon,
  CalendarIcons,
  Location,
  UserIcons,
  ClockIcon,
  FlameIcon,
  AtomIcon,
} from "@/assets/icons";
import {
  CHRONOTYPE_LABEL,
  COACHING_TYPE_LABEL,
  STUDY_WINDOW_LABEL,
  daysUntil,
  formatDate,
  formatLastActive,
  formatTimestamp,
  levelLabel,
} from "@/lib/users/directory";
import { getStudent, type Student } from "@/lib/api/students";
import { ApiError } from "@/lib/api/http";

/** A 20x20 frame drawn with a 1.67px line, whatever viewBox the source SVG used. */
const ROW_ICON =
  "h-5 w-5 shrink-0 **:stroke-[1.67px] **:[vector-effect:non-scaling-stroke]";

/**
 * How many detail rows to hold space for while loading. The real set is seven
 * or eight depending on whether the student is in coaching, and in a
 * two-column grid both land on four rows — so the card is the same height
 * either way and nothing shifts when the data arrives.
 */
const DETAIL_PLACEHOLDER_COUNT = 8;

/** Onboarding can leave any of these unanswered, and an admin reading the
 * profile needs to see that plainly rather than a blank line. */
const NOT_SET = "Not set";

function orNotSet(value: string | null | undefined): string {
  return value && value.trim() ? value : NOT_SET;
}

export function StudentProfileView({ studentId }: { studentId: string }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Aborted on unmount so a slow response can't call setState after the
    // page has navigated away.
    const controller = new AbortController();

    getStudent(studentId)
      .then((data) => {
        if (!controller.signal.aborted) setStudent(data);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        // A 401 is handled by the request wrapper, which refreshes the token
        // or signs the admin out.
        if (err instanceof ApiError && err.status === 401) return;
        setError(
          err instanceof ApiError && err.status === 404
            ? "This student no longer exists."
            : err instanceof ApiError
              ? err.message
              : "Could not load this student. Check your connection and try again.",
        );
      });

    return () => controller.abort();
  }, [studentId]);

  if (error) {
    return (
      <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-8">
        <PageHeader title="Student" subtitle="Full profile and onboarding answers." backHref="/users" />
        <p
          role="alert"
          className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger"
        >
          {error}
        </p>
      </div>
    );
  }

  const isLoading = student === null;

  const inCoaching = student?.coachingType === "COACHING";
  const examLabel = student?.exam ?? "their exam";
  const initial = student?.name.trim()[0]?.toUpperCase() ?? "S";

  // Only meaningful once both the exam and its date are known — a student who
  // skipped the exam-date step has nothing to count down to.
  const days = student?.examDate ? daysUntil(student.examDate) : null;
  const countdown =
    days === null
      ? "Exam date not set"
      : days < 0
        ? `${examLabel} date has passed`
        : days === 0
          ? `${examLabel} is today`
          : `${days} ${days === 1 ? "Day" : "Days"} Until ${examLabel}`;

  // Same set the app's own profile page shows, plus the contact fields the
  // admin needs and onboarding already collects.
  const details = student
    ? [
        {
          label: "Target Exam",
          value: orNotSet(student.exam),
          icon: <QuickIcon className={ROW_ICON} />,
        },
        {
          label: "Coaching",
          value: inCoaching
            ? student.coachingName || "Coaching"
            : student.coachingType
              ? COACHING_TYPE_LABEL[student.coachingType]
              : NOT_SET,
          icon: <Coaching className={ROW_ICON} />,
        },
        {
          label: "Class",
          value: levelLabel(student.level),
          icon: <GraduationCapIcon className={ROW_ICON} />,
        },
        ...(inCoaching
          ? [
              {
                label: "Batch",
                value: student.batchName || "—",
                icon: <UserIcons className={ROW_ICON} />,
              },
            ]
          : []),
        {
          label: "Exam Date",
          value: student.examDate ? formatDate(student.examDate) : NOT_SET,
          icon: <CalendarIcons className={ROW_ICON} />,
        },
        {
          label: "City",
          value: orNotSet(student.city),
          icon: <Location className={ROW_ICON} />,
        },
        {
          label: "Phone Number",
          value: orNotSet(student.phone),
          icon: <PhoneIcon className={ROW_ICON} />,
        },
        { label: "Email Address", value: student.email, icon: <MailIcon /> },
      ]
    : [];

  const hoursSummary =
    student?.weekdayHours === null || student === null
      ? NOT_SET
      : student.sameDailyTarget
        ? `${student.weekdayHours} hrs every day`
        : `${student.weekdayHours} hrs (Weekdays) • ${student.weekendHours} hrs (Weekends)`;

  // A student whose subjects aren't set yet has no chapters to be measured
  // against, so the bar reads zero rather than dividing by it.
  const chapterPercent =
    student && student.chaptersTotal > 0
      ? Math.round((student.chaptersStudied / student.chaptersTotal) * 100)
      : 0;

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-8">
      {/* The name is the page's subject, so it waits with everything else
          rather than heading a card full of placeholders. */}
      <PageHeader
        title={
          !student ? (
            <span className="flex h-8 items-center lg:h-9">
              <Skeleton className="h-7 w-48 rounded-lg sm:w-60" />
            </span>
          ) : (
            <Fade as="span" className="block">
              {student.name}
            </Fade>
          )
        }
        subtitle="Full profile and onboarding answers."
      />

      {/* IDENTITY + DETAILS */}
      <div className="w-full rounded-3xl border border-brand/10 bg-surface p-4 sm:p-6">
        <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:gap-8 xl:gap-20">
          {/* LEFT */}
          <div className="flex w-full shrink-0 flex-col items-center border-b border-brand/10 pb-8 lg:w-[277px] lg:border-b-0 lg:border-r lg:pb-0 lg:pr-10">
            {!student ? (
              <Skeleton className="h-23.25 w-23.25" />
            ) : (
              <Fade>
                <AvatarProgressRing
                  percent={student.completion}
                  initials={initial}
                />
              </Fade>
            )}

            <div className="mt-2 flex h-3 items-center">
              {!student ? (
                <Skeleton className="h-2.5 w-28" />
              ) : (
                <Fade
                  as="p"
                  className="text-center text-[10px] leading-none font-medium text-ink sm:text-[11px]"
                >
                  {student.completion}% Profile complete
                </Fade>
              )}
            </div>

            {/* The name can be long, so it wraps and steps down a size rather
                than pushing past the panel it sits in. */}
            <div className="mt-3 flex min-h-8 w-full items-center justify-center">
              {!student ? (
                <Skeleton className="h-6 w-40 max-w-full rounded-lg" />
              ) : (
                <Fade
                  as="h2"
                  className="w-full text-center text-xl font-bold break-words text-ink sm:text-2xl"
                >
                  {student.name}
                </Fade>
              )}
            </div>

            <div className="mt-3 flex w-full flex-col items-center gap-2">
              {!student ? (
                <>
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-44 max-w-full" />
                  <Skeleton className="h-4 w-36 max-w-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </>
              ) : (
                <Fade className="flex w-full flex-col items-center gap-2">
                  <p className="text-center text-[13px] font-semibold text-ink sm:text-[14px]">
                    {orNotSet(student.exam)}
                  </p>

                  {/* The countdown is the widest line here once the exam name
                      is long, so it wraps around its icon instead of clipping. */}
                  <p className="flex items-start justify-center gap-2 text-center text-[13px] font-semibold text-ink sm:text-[14px]">
                    <CalendarIcons className="mt-0.5 h-4 w-4 shrink-0" />
                    <span className="min-w-0 break-words">{countdown}</span>
                  </p>

                  <p className="text-center text-[13px] break-words text-muted sm:text-[14px]">
                    Last seen · {formatLastActive(student.lastActiveAt)}
                  </p>

                  <Badge
                    tone={student.status === "Active" ? "success" : "neutral"}
                  >
                    {student.status}
                  </Badge>
                </Fade>
              )}
            </div>
          </div>

          {/* RIGHT — which rows exist depends on the student, so the loading
              state holds generic slots rather than guessing their labels. */}
          <div className="flex flex-1 justify-center lg:justify-start">
            <div className="grid w-full max-w-160 grid-cols-1 gap-y-6 sm:grid-cols-2 sm:gap-x-10">
              {isLoading
                ? Array.from(
                    { length: DETAIL_PLACEHOLDER_COUNT },
                    (_, index) => (
                      <div
                        key={`detail-${index}`}
                        className="flex min-h-10 items-center gap-3 sm:gap-4"
                      >
                        <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <Skeleton className="h-2.5 w-20" />
                          <Skeleton className="h-3.5 w-32 max-w-full" />
                        </div>
                      </div>
                    ),
                  )
                : details.map((detail, index) => (
                    <Fade
                      key={detail.label}
                      delay={index * 0.03}
                      className="flex min-h-10 items-center gap-3 sm:gap-4"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#EEF0F8] text-[#1A1A4E] dark:bg-[#FAF7F2]/8 dark:text-[#FAF7F2]">
                        {detail.icon}
                      </div>

                      {/* These values are the page's longest strings — an
                          email, a coaching institute's full name. The row
                          grows to fit instead of a fixed height cropping them,
                          and `anywhere` breaks an email, which has no spaces
                          for a normal word wrap to use. */}
                      <div className="min-w-0 flex-1">
                        <p className="text-[11px] font-medium leading-4 text-muted sm:text-[12px]">
                          {detail.label}
                        </p>
                        <p
                          className="mt-1 text-[13px] leading-5 font-bold text-ink [overflow-wrap:anywhere] sm:text-[14px]"
                          title={detail.value}
                        >
                          {detail.value}
                        </p>
                      </div>
                    </Fade>
                  ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        {/* STUDY PREFERENCES — the row titles are fixed, so only each row's
            answer waits for data. */}
        <Section title="Study Preferences">
          <PreferenceRow
            icon={<ClockIcon className={ROW_ICON} />}
            title="Daily Study Hours"
            detail={hoursSummary}
            loading={isLoading}
          />
          <PreferenceRow
            icon={<QuickIcon className={ROW_ICON} />}
            title="Preferred Time Windows"
            detail={
              student && student.studyWindows.length > 0
                ? student.studyWindows
                    .map((window) => STUDY_WINDOW_LABEL[window])
                    .join(" • ")
                : NOT_SET
            }
            loading={isLoading}
          />
          <PreferenceRow
            icon={<FlameIcon className={ROW_ICON} />}
            title="Chronotype"
            detail={student?.chronotype ? CHRONOTYPE_LABEL[student.chronotype] : NOT_SET}
            loading={isLoading}
          />
        </Section>

        {/* SUBJECTS + PROGRESS */}
        <Section title="Subjects & Progress">
          <PreferenceRow
            icon={<AtomIcon className={ROW_ICON} />}
            title="Subjects"
            detail={
              student && student.subjects.length > 0
                ? student.subjects.join(" • ")
                : NOT_SET
            }
            loading={isLoading}
          />

          <div className="rounded-xl border border-brand/10 px-3 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 text-[12px] leading-5 font-semibold text-ink sm:text-[14px]">
                Chapters Studied
              </p>
              {!student ? (
                <Skeleton className="h-3.5 w-14 shrink-0" />
              ) : (
                <Fade
                  as="p"
                  className="shrink-0 text-[12px] font-bold text-ink tabular-nums sm:text-[13px]"
                >
                  {student.chaptersStudied} / {student.chaptersTotal}
                </Fade>
              )}
            </div>

            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-tint-strong">
              {/* The track is always drawn; only the fill waits, so the row
                  keeps its height either way. */}
              {student && (
                <motion.div
                  className="h-full rounded-full bg-chart-1"
                  initial={{ width: 0 }}
                  animate={{ width: `${chapterPercent}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                />
              )}
            </div>

            <div className="mt-2 flex h-4 items-center">
              {!student ? (
                <Skeleton className="h-2.5 w-48" />
              ) : (
                <Fade
                  as="p"
                  className="text-[10px] leading-4 text-muted sm:text-[11px]"
                >
                  {chapterPercent}% of the syllabus marked as studied
                </Fade>
              )}
            </div>
          </div>

          <PreferenceRow
            icon={<FlameIcon className={ROW_ICON} />}
            title="Current Streak"
            detail={
              student && student.streak > 0
                ? `${student.streak} days`
                : "No active streak"
            }
            loading={isLoading}
          />

          <PreferenceRow
            icon={<CalendarIcons className={ROW_ICON} />}
            title="Member Since"
            detail={student ? formatTimestamp(student.joinedAt) : NOT_SET}
            loading={isLoading}
          />
        </Section>
      </div>
    </div>
  );
}

/**
 * One fade, used everywhere a value replaces its placeholder, so the whole
 * page settles on the same timing instead of each section easing differently.
 */
function Fade({
  children,
  className = "",
  delay = 0,
  as = "div",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "p" | "span" | "h2";
}) {
  const Tag = motion[as];
  return (
    <Tag
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </Tag>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-brand/10 bg-surface p-4 sm:p-6">
      <h2 className="text-[14px] leading-6 font-bold text-ink sm:text-[16px]">
        {title}
      </h2>
      <div className="mt-4 space-y-3 sm:mt-6 sm:space-y-4">{children}</div>
    </div>
  );
}

function PreferenceRow({
  icon,
  title,
  detail,
  loading = false,
}: {
  icon: ReactNode;
  title: string;
  detail: string;
  loading?: boolean;
}) {
  return (
    <div className="flex min-h-15 w-full items-center gap-3 rounded-xl border border-brand/10 px-3 py-3 sm:min-h-16.5 sm:gap-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-tint text-ink sm:h-10 sm:w-10">
        {icon}
      </div>

      <div className="min-w-0 flex-1 text-left">
        <p className="text-[12px] leading-5 font-semibold text-ink sm:text-[14px]">
          {title}
        </p>
        {/* Answers like "6 hrs (Weekdays) • 9 hrs (Weekends)" or all four time
            windows run long, so the line wraps instead of being cropped — the
            row's min-height keeps short ones from shrinking it. */}
        <div className="mt-0.5 flex min-h-4 items-center">
          {loading ? (
            <Skeleton className="h-2.5 w-40 max-w-full" />
          ) : (
            <Fade
              as="p"
              className="text-[11px] leading-4 break-words text-muted sm:text-xs"
            >
              {detail}
            </Fade>
          )}
        </div>
      </div>
    </div>
  );
}
