/**
 * Display labels and date formatting for the student directory.
 *
 * The rows themselves come from `@/lib/api/students` (GET /admin/students,
 * proxied by dashboard-service from core-service). What's left here is the
 * mapping from the enum values that API returns to the words shown on screen,
 * so the table and the profile page never disagree about what "DROPPER_1"
 * reads as.
 */

import type {
  AcademicLevel,
  Chronotype,
  CoachingType,
  StudyWindow,
} from "@/lib/api/students";

export const ACADEMIC_LEVELS = [
  "CLASS_11",
  "CLASS_12",
  "DROPPER_1",
  "DROPPER_2",
  "OTHER",
] as const satisfies readonly AcademicLevel[];

export const ACADEMIC_LEVEL_LABEL: Record<AcademicLevel, string> = {
  CLASS_11: "Class 11",
  CLASS_12: "Class 12",
  DROPPER_1: "Dropper (1st year)",
  DROPPER_2: "Dropper (2nd year)",
  OTHER: "Other",
};

export const STUDENT_STATUSES = ["Active", "Inactive"] as const;

export const COACHING_TYPE_LABEL: Record<CoachingType, string> = {
  COACHING: "Coaching",
  SELF_PREP: "Self-prep",
  ONLINE_SELF_PREP: "Online self-prep",
};

export const STUDY_WINDOW_LABEL: Record<StudyWindow, string> = {
  MORNING: "Morning",
  MIDDAY: "Midday",
  EVENING: "Evening",
  NIGHT: "Night",
};

export const CHRONOTYPE_LABEL: Record<Chronotype, string> = {
  MORNING_PERSON: "Morning Person",
  MIDDAY_PERSON: "Day Person",
  EVENING_PERSON: "Evening Person",
  NIGHT_PERSON: "Night Person",
};

/** Falls back to an em dash rather than printing a raw enum value we don't know. */
export function levelLabel(level: AcademicLevel | null): string {
  return level ? ACADEMIC_LEVEL_LABEL[level] ?? level : "—";
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2027-01-24" -> "24 Jan 2027". Parsed by hand so no timezone shifts the day. */
export function formatDate(isoDate: string): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
}

/** An ISO timestamp -> "24 Jan 2027", in the reader's own timezone. */
export function formatTimestamp(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** Whole days from today to `isoDate`; negative once the date has passed. */
export function daysUntil(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map(Number);
  const target = new Date(y, (m ?? 1) - 1, d).getTime();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target - today.getTime()) / 86_400_000);
}

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/**
 * "18 min ago", "2 hrs ago", "21 days ago" — the same phrasing the student
 * app uses for its own last-seen line.
 *
 * Past a couple of months the exact count stops being informative, so it
 * falls back to the date.
 */
export function formatLastActive(iso: string | null): string {
  if (!iso) return "Never";

  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "Never";

  const elapsed = Date.now() - then;
  // A clock skew between the server and the browser can put "last seen"
  // slightly in the future; that still means right now.
  if (elapsed < MINUTE) return "Just now";
  if (elapsed < HOUR) {
    const minutes = Math.floor(elapsed / MINUTE);
    return `${minutes} min ago`;
  }
  if (elapsed < DAY) {
    const hours = Math.floor(elapsed / HOUR);
    return `${hours} ${hours === 1 ? "hr" : "hrs"} ago`;
  }
  const days = Math.floor(elapsed / DAY);
  if (days < 60) return `${days} ${days === 1 ? "day" : "days"} ago`;
  return formatTimestamp(iso);
}
