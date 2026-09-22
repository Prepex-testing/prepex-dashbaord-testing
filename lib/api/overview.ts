import { adminRequest, publicRequest } from "@/lib/api/adminRequest";

/**
 * Everything behind the dashboard's headline cards and four charts, in one
 * request — GET /admin/overview.
 *
 * Student figures come from core-service (proxied), library figures are
 * counted in dashboard-service. One call rather than five, so the cards and
 * charts land together instead of the page reflowing as each arrives.
 */

export type ActivityPoint = {
  /** "YYYY-MM-DD" — the day, or the first day of the week for the 6-month series. */
  date: string;
  value: number;
};

export type AdminOverview = {
  students: {
    total: number;
    activeToday: number;
    /** Students active within `activeWindowDays`. */
    active: number;
    activeWindowDays: number;
    /** Mean weekday study target across active students, in hours. */
    avgWeekdayHours: number | null;
  };
  library: {
    notes: number;
    formulaSheets: number;
    lectures: number;
    questions: number;
    total: number;
  };
  /** One entry per configured exam, including exams with no students yet. */
  studentsByExam: { examId: string; label: string; value: number }[];
  /** Keyed by AcademicLevel, plus "UNKNOWN" for profiles that never set one. */
  studentsByLevel: Record<string, number>;
  activity: {
    week: ActivityPoint[];
    month: ActivityPoint[];
    sixMonths: ActivityPoint[];
  };
};

export function getOverview(): Promise<AdminOverview> {
  return adminRequest<AdminOverview>("/admin/overview");
}

export type Exam = {
  id: string;
  code: string;
  name: string;
  defaultExamDate: string | null;
  isActive: boolean;
};

/** GET /exams — public on dashboard-service. Backs the Users page exam filter. */
export function listExams(): Promise<Exam[]> {
  return publicRequest<Exam[]>("/exams");
}

export type Subject = {
  id: number;
  code: string;
  name: string;
};

/** GET /subjects — public. Backs the Resources subject filter. */
export function listSubjects(): Promise<Subject[]> {
  return publicRequest<Subject[]>("/subjects");
}
