"use client";

import { useEffect, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ChevronDownIcon } from "@/components/ui/icons";
import { RESOURCE_TYPE_ICONS } from "@/components/resources/typeIcons";
import {
  LECTURE_CATEGORY_TONE,
  difficultyCell,
  duration,
  getResourceType,
  questionSource,
  shortDate,
  titleCase,
  type Cell,
  type ResourceTypeDef,
} from "@/lib/resources/catalog";
import {
  getChapterContent,
  type ChapterContent,
  type QuestionRow,
  type ResourceRow,
} from "@/lib/api/content";
import { ApiError } from "@/lib/api/http";

/**
 * Every item of one type in one chapter, with all the detail the list table
 * leaves out — a note's mistakes and examples, a formula's variables, a
 * question's options, answer and solution.
 *
 * Opened from a row on /resources/[type]; that row's id rides along as the
 * URL hash, so the item that was clicked is scrolled to and highlighted.
 */
export function ResourceChapterView({ slug, chapterId }: { slug: string; chapterId: string }) {
  // The route has already rejected unknown slugs.
  const type = getResourceType(slug)!;
  const Icon = RESOURCE_TYPE_ICONS[type.icon];

  const [content, setContent] = useState<ChapterContent<ResourceRow | QuestionRow> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [focusedId, setFocusedId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    getChapterContent(chapterId, type.contentType)
      .then((data) => {
        if (!controller.signal.aborted) setContent(data);
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 401) return;
        setError(
          err instanceof ApiError && err.status === 404
            ? "This chapter no longer exists."
            : err instanceof ApiError
              ? err.message
              : "Could not load this chapter. Check your connection and try again.",
        );
      });
    return () => controller.abort();
  }, [chapterId, type.contentType]);

  // Once the items are on screen, bring the one the admin clicked into view.
  // A plain #hash jump can't do this: the target doesn't exist until the
  // fetch lands.
  useEffect(() => {
    if (!content) return;
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (!id) return;
    const target = document.getElementById(itemAnchor(id));
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    // Deferred so the highlight is set from a callback, not synchronously in
    // the effect body.
    const frame = requestAnimationFrame(() => setFocusedId(id));
    return () => cancelAnimationFrame(frame);
  }, [content]);

  const chapter = content?.chapter;
  const total = content?.total ?? 0;
  const unit = total === 1 ? type.singular.toLowerCase() : type.label.toLowerCase();
  const subtitle = chapter
    ? [chapter.subject.name, chapter.class ? `Class ${chapter.class}` : null, `${total} ${unit}`]
        .filter(Boolean)
        .join(" · ")
    : type.description;

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title={
          chapter ? (
            chapter.name
          ) : error ? (
            type.label
          ) : (
            <span className="flex h-8 items-center lg:h-9">
              <Skeleton className="h-7 w-56 rounded-lg sm:w-72" />
            </span>
          )
        }
        subtitle={subtitle}
        backHref={`/resources/${type.slug}`}
      />

      {error ? (
        <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      ) : !content ? (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }, (_, index) => (
            <Card key={index}>
              <Skeleton className="h-4 w-64 max-w-full" />
              <Skeleton className="mt-3 h-3 w-full" />
              <Skeleton className="mt-2 h-3 w-4/5" />
            </Card>
          ))}
        </div>
      ) : content.items.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-16 text-center">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-tint text-ink">
            <Icon className="h-5 w-5" />
          </span>
          <p className="text-sm font-bold text-ink">No {type.label.toLowerCase()} in this chapter</p>
        </Card>
      ) : (
        <ol className="flex flex-col gap-4">
          {content.items.map((item, index) => (
            <li
              key={item.id}
              id={itemAnchor(item.id)}
              className={`scroll-mt-6 rounded-2xl transition-shadow duration-500 ${
                focusedId === item.id ? "ring-2 ring-brand ring-offset-2 ring-offset-background" : ""
              }`}
            >
              <ItemCard type={type} item={item} index={index} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Element id for an item — prefixed so a UUID never starts with a digit. */
function itemAnchor(id: string) {
  return `item-${id}`;
}

function ItemCard({
  type,
  item,
  index,
}: {
  type: ResourceTypeDef;
  item: ResourceRow | QuestionRow;
  index: number;
}) {
  switch (type.contentType) {
    case "NOTE":
      return <NoteCard note={item as ResourceRow} />;
    case "FORMULA_SHEET":
      return <FormulaCard formula={item as ResourceRow} />;
    case "YOUTUBE":
      return <LectureCard lecture={item as ResourceRow} />;
    case "PRACTICE_QUESTION":
      return <QuestionCard question={item as QuestionRow} number={index + 1} />;
  }
}

// ---------------------------------------------------------------------------
// Per-type cards
// ---------------------------------------------------------------------------

function NoteCard({ note }: { note: ResourceRow }) {
  return (
    <Card>
      <CardTitle title={note.title} badges={[difficultyCell(note.difficulty)]} />
      {note.oneLiner && <p className="mt-2 text-sm leading-6 text-body-text">{note.oneLiner}</p>}
      {note.formula && <FormulaBlock value={note.formula} />}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {nonEmpty(note.whenToUse) && (
          <Field label="When to use">
            <BulletList items={note.whenToUse!} />
          </Field>
        )}
        {note.quickExample && (
          <Field label="Quick example">
            <Prose>{note.quickExample}</Prose>
          </Field>
        )}
      </div>

      {note.commonMistake && (
        <Callout tone="warning" label="Common mistake">
          {note.commonMistake}
        </Callout>
      )}
      {nonEmpty(note.connectsTo) && (
        <Field label="Connects to" className="mt-4">
          <Chips items={note.connectsTo!} />
        </Field>
      )}
    </Card>
  );
}

function FormulaCard({ formula }: { formula: ResourceRow }) {
  return (
    <Card>
      <CardTitle title={formula.title} />
      {formula.formula && <FormulaBlock value={formula.formula} />}

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {nonEmpty(formula.variables) && (
          <Field label="Variables">
            <BulletList items={formula.variables} />
          </Field>
        )}
        {nonEmpty(formula.conditions) && (
          <Field label="Conditions">
            <BulletList items={formula.conditions} />
          </Field>
        )}
      </div>

      {formula.jeeTrick && (
        <Callout tone="info" label="JEE trick">
          {formula.jeeTrick}
        </Callout>
      )}
    </Card>
  );
}

function LectureCard({ lecture }: { lecture: ResourceRow }) {
  const category: Cell = lecture.lectureCategory
    ? {
        badge: titleCase(lecture.lectureCategory),
        tone: LECTURE_CATEGORY_TONE[lecture.lectureCategory] ?? "neutral",
      }
    : "—";

  return (
    <Card>
      <CardTitle title={lecture.title} badges={[category]} />
      <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        <Meta label="Channel" value={lecture.channel} />
        <Meta label="Topic" value={lecture.topic} />
        <Meta label="Duration" value={duration(lecture.durationMin)} />
        <Meta label="Published" value={shortDate(lecture.publishedAt)} />
      </dl>
      {lecture.url && (
        <a
          href={lecture.url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
        >
          Watch on YouTube ↗
        </a>
      )}
    </Card>
  );
}

function QuestionCard({ question, number }: { question: QuestionRow; number: number }) {
  const correct = correctLetters(question.correctAnswer);
  const options = question.options ? Object.entries(question.options) : [];
  const badges: Cell[] = [
    { badge: titleCase(question.questionType), tone: "neutral" },
    difficultyCell(question.difficulty),
    question.isPYQ ? { badge: questionSource(question), tone: "info" } : titleCase(question.source),
  ];

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-bold text-muted">Q{number}</span>
        {badges.map((badge, index) => (
          <CellBadge key={index} cell={badge} />
        ))}
      </div>
      <p className="mt-1 text-xs text-muted">
        {[question.topic, question.subTopic].filter(Boolean).join(" › ")}
      </p>

      <Prose className="mt-3 text-sm font-semibold text-ink">{question.questionText}</Prose>
      {question.questionImageUrl && (
        // Admin-uploaded image of unknown size — a plain img, capped in width.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={question.questionImageUrl} alt="" className="mt-3 max-h-72 max-w-full rounded-lg" />
      )}

      {options.length > 0 && (
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {options.map(([letter, text]) => {
            const isCorrect = correct.includes(letter);
            return (
              <li
                key={letter}
                className={`flex gap-2.5 rounded-xl border px-3 py-2.5 text-sm ${
                  isCorrect
                    ? "border-success/40 bg-success-bg text-ink"
                    : "border-task-card-border text-body-text"
                }`}
              >
                <span className={`font-bold ${isCorrect ? "text-success" : "text-muted"}`}>{letter}</span>
                <span className="min-w-0 flex-1 whitespace-pre-wrap break-words">{text}</span>
                {isCorrect && <span className="sr-only">(correct)</span>}
              </li>
            );
          })}
        </ul>
      )}

      {(question.answerText || correct.length > 0) && (
        <p className="mt-4 text-sm text-body-text">
          <span className="font-bold text-ink">Answer: </span>
          {question.answerText || correct.join(", ")}
        </p>
      )}

      {(question.solutionText || question.solutionImageUrl) && (
        <details className="group mt-4 rounded-xl border border-task-card-border">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-ink [&::-webkit-details-marker]:hidden">
            Solution
            <ChevronDownIcon className="h-4 w-4 text-muted transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-task-card-border px-4 py-3">
            {question.solutionText && <Prose>{question.solutionText}</Prose>}
            {question.solutionImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={question.solutionImageUrl} alt="" className="mt-3 max-h-72 max-w-full rounded-lg" />
            )}
          </div>
        </details>
      )}

      {nonEmpty(question.tags) && (
        <div className="mt-4">
          <Chips items={question.tags!} />
        </div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Building blocks
// ---------------------------------------------------------------------------

function CardTitle({ title, badges = [] }: { title: string; badges?: Cell[] }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2">
      <h2 className="min-w-0 flex-1 text-base font-bold break-words text-ink">{title}</h2>
      {badges.map((badge, index) => (
        <CellBadge key={index} cell={badge} />
      ))}
    </div>
  );
}

function CellBadge({ cell }: { cell: Cell }) {
  if (typeof cell === "string") {
    return cell === "—" ? null : <Badge>{cell}</Badge>;
  }
  return <Badge tone={cell.tone}>{cell.badge}</Badge>;
}

function FormulaBlock({ value }: { value: string }) {
  return (
    <p className="mt-3 rounded-xl bg-tint px-4 py-3 font-mono text-sm break-words whitespace-pre-wrap text-ink">
      {value}
    </p>
  );
}

function Field({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{label}</p>
      {children}
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="mt-0.5 truncate text-sm text-body-text">{value || "—"}</dd>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="flex list-disc flex-col gap-1 pl-5 text-sm leading-6 text-body-text marker:text-muted">
      {items.map((item, index) => (
        <li key={index} className="break-words">
          {item}
        </li>
      ))}
    </ul>
  );
}

function Chips({ items }: { items: string[] }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((item, index) => (
        <Badge key={index}>{item}</Badge>
      ))}
    </div>
  );
}

function Callout({ tone, label, children }: { tone: "warning" | "info"; label: string; children: ReactNode }) {
  const toneClass = tone === "warning" ? "bg-warning-bg text-warning" : "bg-info-bg text-info";
  return (
    <div className={`mt-4 rounded-xl px-4 py-3 ${toneClass}`}>
      <p className="text-[11px] font-bold uppercase tracking-[0.08em]">{label}</p>
      <p className="mt-1 text-sm leading-6 whitespace-pre-wrap text-ink">{children}</p>
    </div>
  );
}

/** Bank text carries its own line breaks (solution steps), so they're kept. */
function Prose({ children, className = "text-sm text-body-text" }: { children: ReactNode; className?: string }) {
  return <p className={`leading-6 break-words whitespace-pre-wrap ${className}`}>{children}</p>;
}

function nonEmpty(list: string[] | undefined | null) {
  return Array.isArray(list) && list.length > 0;
}

/** correctAnswer is "A", ["A", "C"], or a number for INTEGER questions. */
function correctLetters(answer: unknown): string[] {
  if (typeof answer === "string") return [answer];
  if (Array.isArray(answer)) return answer.map(String);
  if (typeof answer === "number") return [String(answer)];
  return [];
}
