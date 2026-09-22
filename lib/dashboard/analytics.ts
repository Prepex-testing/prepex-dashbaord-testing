/**
 * Shapes the dashboard's headline cards and charts from one
 * GET /admin/overview response.
 *
 * Student figures are counted in core-service and library figures in
 * dashboard-service, but both arrive together, so a figure on a card always
 * agrees with the chart beside it. Nothing here holds data — these are pure
 * functions over the response.
 */

import type { ActivityPoint, AdminOverview } from "@/lib/api/overview";
import { ACADEMIC_LEVELS, ACADEMIC_LEVEL_LABEL } from "@/lib/users/directory";
import { RESOURCE_TYPES } from "@/lib/resources/catalog";

export type ChartPoint = { label: string; fullLabel?: string; value: number };

export type ActivityRangeKey = "week" | "month" | "sixMonths";

export const DEFAULT_ACTIVITY_RANGE: ActivityRangeKey = "week";

/**
 * The range dropdown's options, in order. Kept separate from the built ranges
 * so the filter can render before any data has arrived — the labels never
 * depend on the response.
 */
export const ACTIVITY_RANGE_ORDER: ActivityRangeKey[] = ["week", "month", "sixMonths"];

export const ACTIVITY_RANGE_LABEL: Record<ActivityRangeKey, string> = {
  week: "1 week",
  month: "1 month",
  sixMonths: "6 months",
};

const MONTHS_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** "2026-09-22" -> a local Date, so no timezone shifts the day. */
function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1);
}

/** Mean hours as "2h 14m", or an em dash when there's no active cohort to average. */
export function formatAvgStudyTime(hours: number | null): string {
  if (hours === null) return "—";
  const whole = Math.floor(hours);
  const minutes = Math.round((hours - whole) * 60);
  return `${whole}h ${String(minutes).padStart(2, "0")}m`;
}

/**
 * The three ranges the activity card offers.
 *
 * Each is labelled for its own resolution: weekdays over one week, day and
 * month over 30 days, and the containing month over 26 weeks — 180 daily
 * points would be unreadable on a single card, so the long range arrives
 * pre-bucketed by week.
 */
export function buildActivityRanges(overview: AdminOverview): Record<
  ActivityRangeKey,
  { label: string; caption: string; points: ChartPoint[] }
> {
  const daily = (points: ActivityPoint[]): ChartPoint[] =>
    points.map((point) => {
      const date = parseIsoDate(point.date);
      const dayMonth = `${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`;
      return {
        label: dayMonth,
        fullLabel: `${WEEKDAYS_SHORT[date.getDay()]} ${dayMonth}`,
        value: point.value,
      };
    });

  return {
    week: {
      label: ACTIVITY_RANGE_LABEL.week,
      caption: "Students who opened a session, last 7 days",
      // A single week is short enough to name each day, which reads better
      // than seven dates.
      points: overview.activity.week.map((point) => {
        const date = parseIsoDate(point.date);
        return {
          label: WEEKDAYS_SHORT[date.getDay()] ?? point.date,
          fullLabel: `${WEEKDAYS_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`,
          value: point.value,
        };
      }),
    },
    month: {
      label: ACTIVITY_RANGE_LABEL.month,
      caption: "Students who opened a session, last 30 days",
      points: daily(overview.activity.month),
    },
    sixMonths: {
      label: ACTIVITY_RANGE_LABEL.sixMonths,
      caption: "Weekly average active students, last 26 weeks",
      points: overview.activity.sixMonths.map((point) => {
        const date = parseIsoDate(point.date);
        return {
          label: MONTHS_SHORT[date.getMonth()] ?? point.date,
          fullLabel: `Week of ${date.getDate()} ${MONTHS_SHORT[date.getMonth()]}`,
          value: point.value,
        };
      }),
    },
  };
}

/** How the student body splits across target exams, biggest first. */
export function buildStudentsByExam(overview: AdminOverview): ChartPoint[] {
  return [...overview.studentsByExam]
    .map((entry) => ({ label: entry.label, value: entry.value }))
    .sort((a, b) => b.value - a.value);
}

/**
 * How the student body splits across academic levels.
 *
 * Driven by the known levels rather than by the response's keys, so the chart
 * keeps a stable order and a level with no students still shows as zero.
 * "OTHER" and profiles that never set a level are folded together, since both
 * mean "not one of the four".
 */
export function buildStudentsByLevel(overview: AdminOverview): ChartPoint[] {
  const counts = overview.studentsByLevel;

  return ACADEMIC_LEVELS.map((level) => ({
    label: ACADEMIC_LEVEL_LABEL[level],
    value:
      level === "OTHER"
        ? (counts.OTHER ?? 0) + (counts.UNKNOWN ?? 0)
        : (counts[level] ?? 0),
  })).filter(
    // Every real level is shown; "Other" only earns a row when it has someone
    // in it, so the usual case isn't a chart with a permanent empty bar.
    (entry) => entry.label !== ACADEMIC_LEVEL_LABEL.OTHER || entry.value > 0,
  );
}

/** Library size by content type, biggest first. */
export function buildResourcesByType(
  overview: AdminOverview,
): (ChartPoint & { display: string })[] {
  return RESOURCE_TYPES.map((type) => {
    const value = overview.library[type.countKey];
    return { label: type.label, value, display: value.toLocaleString() };
  }).sort((a, b) => b.value - a.value);
}
