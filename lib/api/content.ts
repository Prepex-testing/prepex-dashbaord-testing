import { adminRequest, adminUploadText } from "@/lib/api/adminRequest";

/**
 * The library, as the Resources pages read and add to it.
 *
 * Listing is read-only and pages server-side: one content type per request,
 * with the matching total, so the table paginates against the real count
 * rather than whatever it happens to be holding.
 *
 * Adding is bulk-only. dashboard-service parses the fixed Prepex_*.txt bank
 * formats server-side (see its dashboard.fileParser.ts), so an upload posts
 * the file's text verbatim and gets back how many rows landed.
 */

export type ContentType = "NOTE" | "FORMULA_SHEET" | "YOUTUBE" | "PRACTICE_QUESTION";

export type SubjectRef = { id: number; code: string; name: string };

export type ChapterRef = {
  id: string;
  name: string;
  class: number | null;
  sequenceOrder: number | null;
};

/** A row of `resources` — a note, a formula sheet or a lecture. */
export type ResourceRow = {
  id: string;
  type: Exclude<ContentType, "PRACTICE_QUESTION">;
  title: string;
  description: string | null;
  class: number | null;
  difficulty: string | null;
  url: string | null;
  createdAt: string;
  updatedAt: string;
  subject: SubjectRef;
  chapter: ChapterRef | null;

  thumbnailUrl?: string | null;

  // NOTE
  oneLiner: string | null;
  whenToUse?: string[];
  commonMistake?: string | null;
  quickExample?: string | null;
  connectsTo?: string[];
  // NOTE + FORMULA_SHEET — the expression itself; `title` holds its name.
  formula: string | null;
  // FORMULA_SHEET
  variables: string[];
  conditions: string[];
  jeeTrick: string | null;
  // YOUTUBE
  channel: string | null;
  lectureCategory: "ONE_SHOT" | "REVISION" | "TOPIC_WISE" | null;
  topic: string | null;
  publishedAt: string | null;
  durationMin: number | null;
};

/** A row of `practice_questions`. */
export type QuestionRow = {
  id: string;
  questionText: string;
  topic: string;
  subTopic: string | null;
  questionType: string;
  difficulty: string;
  class: number | null;
  source: string;
  isPYQ: boolean;
  examDetail: string | null;
  year: number | null;
  paper: string | null;
  shift?: string | null;
  createdAt: string;
  subject: SubjectRef;
  chapter: ChapterRef | null;

  // Full detail — present on every row, read by the chapter page.
  /** Option letter -> option text, e.g. { A: "5.65 cm", ... }; null for INTEGER. */
  options?: Record<string, string> | null;
  /** "A", ["A", "C"] or a number, depending on questionType. */
  correctAnswer?: unknown;
  answerText?: string | null;
  solutionText?: string | null;
  questionImageUrl?: string | null;
  solutionImageUrl?: string | null;
  tags?: string[];
  expectedTimeSeconds?: number | null;
  jeeWeightage?: string | null;
};

export type ContentPage<T> = {
  contentType: ContentType;
  total: number;
  page: number;
  limit: number;
  items: T[];
};

export type ContentListFilters = {
  contentType: ContentType;
  subjectId?: number;
  search?: string;
  page?: number;
  limit?: number;
};

export function listContent(
  filters: ContentListFilters,
): Promise<ContentPage<ResourceRow | QuestionRow>> {
  const params = new URLSearchParams({ contentType: filters.contentType });
  if (filters.subjectId !== undefined) params.set("subjectId", String(filters.subjectId));
  if (filters.search) params.set("search", filters.search);
  params.set("page", String(filters.page ?? 1));
  params.set("limit", String(filters.limit ?? 20));

  return adminRequest<ContentPage<ResourceRow | QuestionRow>>(
    `/admin/content?${params.toString()}`,
  );
}

export type ChapterDetail = ChapterRef & {
  subject: SubjectRef;
  exam: string | null;
  chapterMetadata: { difficulty: string | null } | null;
};

export type ChapterContent<T> = {
  contentType: ContentType;
  chapter: ChapterDetail;
  total: number;
  items: T[];
};

/**
 * GET /admin/content/chapters/:chapterId — every item of one type in one
 * chapter, all fields. Unpaged; the largest chapter holds ~50 questions.
 */
export function getChapterContent(
  chapterId: string,
  contentType: ContentType,
): Promise<ChapterContent<ResourceRow | QuestionRow>> {
  const params = new URLSearchParams({ contentType });
  return adminRequest<ChapterContent<ResourceRow | QuestionRow>>(
    `/admin/content/chapters/${encodeURIComponent(chapterId)}?${params.toString()}`,
  );
}

export type ContentCounts = {
  notes: number;
  formulaSheets: number;
  lectures: number;
  questions: number;
};

/** GET /admin/content-counts — the tally on each row of the Resources index. */
export function getContentCounts(): Promise<ContentCounts> {
  return adminRequest<ContentCounts>("/admin/content-counts");
}

// ---------------------------------------------------------------------------
// Bulk upload
// ---------------------------------------------------------------------------

/**
 * Which endpoint each upload target posts to. Questions have two banks with
 * two different parsers — the curated practice bank and the JEE PYQ bank — so
 * they are separate targets rather than one endpoint with a flag.
 */
export const BULK_UPLOAD_PATHS = {
  notes: "/resources/notes/bulk",
  "formula-sheets": "/resources/formula-sheets/bulk",
  lectures: "/resources/youtube/bulk",
  questions: "/practice-questions/bulk",
  "questions-pyq": "/practice-questions/pyq/bulk",
} as const;

export type BulkUploadTarget = keyof typeof BULK_UPLOAD_PATHS;

export type BulkUploadResult = {
  /** Rows written. */
  count: number;
  /** Set by the endpoints that resolve chapters by name as they import. */
  chaptersTouched?: number;
};

/**
 * Which question bank a file is, read off its own contents.
 *
 * The two banks have incompatible layouts and separate parsers server-side:
 * the curated practice bank is flat `SUBJECT:` / `QUESTION:` key lines, while
 * the JEE PYQ bank is markdown (`### Question 1`, `**Question:**`). Posting
 * one to the other's endpoint just fails, so the dialog picks the endpoint
 * from the file rather than asking the admin which bank they are holding.
 */
export function detectQuestionBank(fileText: string): Extract<
  BulkUploadTarget,
  "questions" | "questions-pyq"
> {
  // Only the head of the file is examined: these markers appear within the
  // first question either way, and a question bank can be megabytes long.
  const head = fileText.slice(0, 20_000);

  const looksLikePyq = /^###\s+Question\s+\d+/m.test(head) || /^\*\*Question:\*\*/m.test(head);
  const looksLikePractice = /^SUBJECT:/m.test(head) && /^QUESTION:/m.test(head);

  // When a file somehow matches both, the flat format wins: its markers are
  // the stricter pair, so matching them is the stronger signal.
  if (looksLikePractice) return "questions";
  if (looksLikePyq) return "questions-pyq";

  // Neither matched — send it to the practice parser, whose error message
  // names the key lines it expected.
  return "questions";
}

export function bulkUpload(
  target: BulkUploadTarget,
  fileText: string,
): Promise<BulkUploadResult> {
  // The Questions type covers two banks; the file itself says which.
  const path =
    target === "questions"
      ? BULK_UPLOAD_PATHS[detectQuestionBank(fileText)]
      : BULK_UPLOAD_PATHS[target];

  return adminUploadText<BulkUploadResult>(path, fileText);
}
