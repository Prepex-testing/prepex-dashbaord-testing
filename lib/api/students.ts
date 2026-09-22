import { adminRequest } from "@/lib/api/adminRequest";

/**
 * The student directory — GET /admin/students.
 *
 * dashboard-service owns no user tables; it proxies these from core-service
 * and resolves the exam and subject ids on its profile to names before
 * replying, so nothing here has to look them up again.
 *
 * Searching, filtering and paging all happen server-side, so the table asks
 * for one page at a time rather than filtering a full directory in the
 * browser.
 */

export type StudentStatus = "Active" | "Inactive";

export type AcademicLevel = "CLASS_11" | "CLASS_12" | "DROPPER_1" | "DROPPER_2" | "OTHER";

export type CoachingType = "COACHING" | "SELF_PREP" | "ONLINE_SELF_PREP";

export type StudyWindow = "MORNING" | "MIDDAY" | "EVENING" | "NIGHT";

export type Chronotype =
  | "MORNING_PERSON"
  | "MIDDAY_PERSON"
  | "EVENING_PERSON"
  | "NIGHT_PERSON";

export type Student = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  city: string | null;
  avatarUrl: string | null;
  /** ISO timestamp of when the account was created. */
  joinedAt: string;

  examId: string | null;
  /** Exam name, resolved from `examId` by dashboard-service. */
  exam: string | null;
  /** "YYYY-MM-DD", or null when onboarding never set a target date. */
  examDate: string | null;
  subjects: string[];

  level: AcademicLevel | null;
  coachingType: CoachingType | null;
  coachingName: string | null;
  batchName: string | null;
  weekdayHours: number | null;
  weekendHours: number | null;
  sameDailyTarget: boolean | null;
  chronotype: Chronotype | null;
  studyWindows: StudyWindow[];

  status: StudentStatus;
  /** Day-level streak, as the student app counts it. */
  streak: number;
  /** ISO timestamp of the last app open, or null if it has never been opened. */
  lastActiveAt: string | null;
  /** Percent of onboarding the student has completed. */
  completion: number;
  onboardingCompleted: boolean;
  chaptersStudied: number;
  /** Active chapters across the subjects this student studies. */
  chaptersTotal: number;
  /** Set while a deletion is pending; the account is still restorable. */
  deletionScheduledAt: string | null;
};

export type StudentListFilters = {
  search?: string;
  level?: AcademicLevel;
  examId?: string;
  status?: "active" | "inactive";
  page?: number;
  limit?: number;
};

export type StudentListPage = {
  total: number;
  page: number;
  limit: number;
  items: Student[];
};

export function listStudents(filters: StudentListFilters = {}): Promise<StudentListPage> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.level) params.set("level", filters.level);
  if (filters.examId) params.set("examId", filters.examId);
  if (filters.status) params.set("status", filters.status);
  params.set("page", String(filters.page ?? 1));
  params.set("limit", String(filters.limit ?? 20));

  return adminRequest<StudentListPage>(`/admin/students?${params.toString()}`);
}

export function getStudent(id: string): Promise<Student> {
  return adminRequest<Student>(`/admin/students/${encodeURIComponent(id)}`);
}
