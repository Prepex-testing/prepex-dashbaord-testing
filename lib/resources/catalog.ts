/**
 * The four kinds of study material in the prepex library, mirroring the
 * content types the student app reads (`NOTE`, `FORMULA_SHEET`, `YOUTUBE`,
 * `PRACTICE_QUESTION`).
 *
 * Each type declares its own table columns and how to turn one API row into
 * those columns, so all four share a single screen. The rows come from
 * GET /admin/content and the tallies from GET /admin/content-counts — nothing
 * in this file holds data.
 */

import type {
  ContentCounts,
  ContentType,
  QuestionRow,
  ResourceRow,
} from "@/lib/api/content";
import type { BulkUploadTarget } from "@/lib/api/content";

export type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

/** A table cell: plain text, or a pill when the value is a status or level. */
export type Cell = string | { badge: string; tone: BadgeTone };

export const RESOURCE_TYPE_SLUGS = [
  "notes",
  "formula-sheets",
  "lectures",
  "questions",
] as const;

export type ResourceTypeSlug = (typeof RESOURCE_TYPE_SLUGS)[number];

/** Icon key the page maps to a component — kept out of this file so it stays plain data. */
export type ResourceIconKey = "notes" | "formula" | "lecture" | "question";

export type ResourceTypeDef = {
  slug: ResourceTypeSlug;
  label: string;
  /** Used in the Add dialog's title, e.g. "Add Note". */
  singular: string;
  description: string;
  icon: ResourceIconKey;
  /** What GET /admin/content is asked for. */
  contentType: ContentType;
  /** Which tally on GET /admin/content-counts is this type's headline count. */
  countKey: keyof ContentCounts;
  /** Which bulk endpoint the Add dialog posts to. */
  uploadTarget: BulkUploadTarget;
  columns: string[];
  /** `accept` for the Add dialog's file input, with a human-readable version. */
  accept: string;
  acceptLabel: string;
  /** Turns one API row into cells positionally aligned with `columns`. */
  toCells: (row: ResourceRow | QuestionRow) => Cell[];
};

// The bulk endpoints parse the fixed Prepex_*.txt bank formats and nothing
// else, so the file input only offers .txt — a CSV or JSON file would be
// accepted by the picker and then rejected by the parser.
const TXT_ACCEPT = ".txt,.md";
const TXT_ACCEPT_LABEL = "The chapter's .txt bank file, up to 25MB";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** An ISO timestamp or date -> "12 Sep 2026". */
export function shortDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.getDate()} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

export function text(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

/** Both the resource ladder (FOUNDATION..ADVANCED) and the question one (EASY..VERY_HARD). */
const DIFFICULTY_TONE: Record<string, BadgeTone> = {
  FOUNDATION: "success",
  BASIC: "success",
  EASY: "success",
  INTERMEDIATE: "warning",
  MEDIUM: "warning",
  ADVANCED: "danger",
  HARD: "danger",
  VERY_HARD: "danger",
};

/** "VERY_HARD" -> "Very hard". */
export function titleCase(value: string): string {
  const spaced = value.replace(/_/g, " ").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export function difficultyCell(raw: string | null): Cell {
  if (!raw) return "—";
  const key = raw.toUpperCase();
  return { badge: titleCase(key), tone: DIFFICULTY_TONE[key] ?? "neutral" };
}

export const LECTURE_CATEGORY_TONE: Record<string, BadgeTone> = {
  ONE_SHOT: "info",
  REVISION: "neutral",
  TOPIC_WISE: "success",
};

/** 222 -> "3h 42m", 58 -> "58m". */
export function duration(minutes: number | null): string {
  if (minutes === null || minutes <= 0) return "—";
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return `${hours}h ${String(rest).padStart(2, "0")}m`;
}

/**
 * What a question row shows in its Source column: the specific sitting for a
 * PYQ ("JEE Main 2020 (06 Sep Shift 2)"), otherwise the bank it came from.
 */
export function questionSource(row: QuestionRow): string {
  if (row.examDetail) return row.examDetail;
  if (row.isPYQ && row.year) return `JEE Main ${row.year}`;
  return titleCase(row.source);
}

const asResource = (row: ResourceRow | QuestionRow) => row as ResourceRow;
const asQuestion = (row: ResourceRow | QuestionRow) => row as QuestionRow;

export const RESOURCE_TYPES: ResourceTypeDef[] = [
  {
    slug: "notes",
    label: "Notes",
    singular: "Note",
    description: "Concept cards with one-liners, common mistakes and quick examples.",
    icon: "notes",
    contentType: "NOTE",
    countKey: "notes",
    uploadTarget: "notes",
    columns: ["Title", "Chapter", "Class", "Difficulty", "Last updated"],
    accept: TXT_ACCEPT,
    acceptLabel: TXT_ACCEPT_LABEL,
    toCells: (input) => {
      const row = asResource(input);
      return [
        row.title,
        text(row.chapter?.name),
        text(row.class),
        difficultyCell(row.difficulty),
        shortDate(row.updatedAt),
      ];
    },
  },
  {
    slug: "formula-sheets",
    label: "Formula Sheets",
    singular: "Formula Sheet",
    description: "Formulas with their variables, conditions and JEE tricks.",
    icon: "formula",
    contentType: "FORMULA_SHEET",
    countKey: "formulaSheets",
    uploadTarget: "formula-sheets",
    columns: ["Formula name", "Expression", "Chapter", "Class", "Last updated"],
    accept: TXT_ACCEPT,
    acceptLabel: TXT_ACCEPT_LABEL,
    toCells: (input) => {
      const row = asResource(input);
      return [
        row.title,
        text(row.formula),
        text(row.chapter?.name),
        text(row.class),
        shortDate(row.updatedAt),
      ];
    },
  },
  {
    slug: "lectures",
    label: "Lectures",
    singular: "Lecture",
    description: "YouTube lectures — one-shots, revisions and topic-wise sessions.",
    icon: "lecture",
    contentType: "YOUTUBE",
    countKey: "lectures",
    uploadTarget: "lectures",
    columns: ["Title", "Channel", "Category", "Duration", "Published"],
    accept: TXT_ACCEPT,
    acceptLabel: TXT_ACCEPT_LABEL,
    toCells: (input) => {
      const row = asResource(input);
      return [
        row.title,
        text(row.channel),
        row.lectureCategory
          ? {
              badge: titleCase(row.lectureCategory),
              tone: LECTURE_CATEGORY_TONE[row.lectureCategory] ?? "neutral",
            }
          : "—",
        duration(row.durationMin),
        shortDate(row.publishedAt),
      ];
    },
  },
  {
    slug: "questions",
    label: "Questions",
    singular: "Question",
    description: "Practice questions and previous-year papers with full solutions.",
    icon: "question",
    contentType: "PRACTICE_QUESTION",
    countKey: "questions",
    // Which of the two question banks a file belongs to is detected from its
    // contents at upload time (see detectQuestionBank in lib/api/content.ts),
    // so this is only the default.
    uploadTarget: "questions",
    columns: ["Question", "Chapter", "Type", "Difficulty", "Source"],
    accept: TXT_ACCEPT,
    acceptLabel: TXT_ACCEPT_LABEL,
    toCells: (input) => {
      const row = asQuestion(input);
      return [
        row.questionText,
        text(row.chapter?.name),
        titleCase(row.questionType),
        difficultyCell(row.difficulty),
        questionSource(row),
      ];
    },
  },
];

export function getResourceType(slug: string): ResourceTypeDef | undefined {
  return RESOURCE_TYPES.find((type) => type.slug === slug);
}
