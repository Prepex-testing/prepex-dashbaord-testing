"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { Skeleton } from "@/components/ui/Skeleton";
import { ApiError } from "@/lib/api/http";
import { feedbackScreenshotUrl, listFeedback, setFeedbackStatus, type FeedbackItem, type FeedbackPage, type FeedbackStatus, type FeedbackType } from "@/lib/api/feedback";

const LIMIT = 20;
const TYPE_LABEL: Record<FeedbackType, string> = { bug: "Bug", idea: "Idea", other: "Other" };
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

function Filter<T extends string>({ label, value, options, onChange }: { label: string; value: T | ""; options: { value: T | ""; label: string }[]; onChange: (v: T | "") => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value || "all"} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)} className={`h-9 rounded-full border px-3 text-xs font-semibold ${value === o.value ? "border-ink bg-ink text-card" : "border-task-card-border text-ink"}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Launch step 2 (B2): what students reported from the app (Report a bug / Share an idea). Filter by type and status,
 * look at the screenshot, mark resolved. New bugs also e-mail the support address.
 */
export default function FeedbackInboxPage() {
  const [type, setType] = useState<FeedbackType | "">("");
  const [status, setStatus] = useState<FeedbackStatus | "">("open");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<FeedbackPage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [shot, setShot] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    listFeedback({ ...(type ? { type } : {}), ...(status ? { status } : {}), page, limit: LIMIT })
      .then((d) => {
        if (alive) {
          setData(d);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (alive) setError(err instanceof ApiError ? err.message : "Could not load feedback.");
      });
    return () => {
      alive = false;
    };
  }, [type, status, page, reload]);

  async function toggle(item: FeedbackItem) {
    setBusyId(item.id);
    try {
      await setFeedbackStatus(item.id, item.status === "open" ? "resolved" : "open");
      setReload((n) => n + 1);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update it.");
    } finally {
      setBusyId(null);
    }
  }

  async function openShot(id: string) {
    try {
      setShot(await feedbackScreenshotUrl(id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load the screenshot.");
    }
  }

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader title="Feedback" subtitle="Bugs and ideas students sent from the app." />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Filter label="Type" value={type} onChange={(v) => { setType(v); setPage(1); }} options={[{ value: "", label: "All" }, { value: "bug", label: "Bugs" }, { value: "idea", label: "Ideas" }, { value: "other", label: "Other" }]} />
        <Filter label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={[{ value: "open", label: "Open" }, { value: "resolved", label: "Resolved" }, { value: "", label: "All" }]} />
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-danger-bg px-4 py-3 text-sm font-medium text-danger">
          {error}
        </p>
      )}
      <Card className="p-0!">
        {!data ? (
          <div className="flex flex-col gap-3 p-5">
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
        ) : data.items.length === 0 ? (
          <p className="p-6 text-sm text-muted">Nothing here.</p>
        ) : (
          <ul className="divide-y divide-task-card-border" data-testid="feedback-list">
            {data.items.map((f) => (
              <li key={f.id} className="flex flex-col gap-2 px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-muted">
                    <span className={f.type === "bug" ? "text-danger" : "text-ink"}>{TYPE_LABEL[f.type]}</span> · {when(f.createdAt)} · {f.route ?? "unknown screen"} · v{f.appVersion ?? "?"}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm text-ink">{f.message}</p>
                  <p className="mt-1 truncate text-xs text-muted" title={f.device ?? ""}>
                    {f.device ?? "unknown device"} · student {f.userId}
                    {f.status === "resolved" && f.resolvedAt ? ` · resolved ${when(f.resolvedAt)}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  {f.hasScreenshot && (
                    <button type="button" onClick={() => void openShot(f.id)} className="h-9 rounded-lg border border-task-card-border px-3 text-xs font-semibold text-ink">
                      Screenshot
                    </button>
                  )}
                  <button type="button" disabled={busyId === f.id} onClick={() => void toggle(f)} className="h-9 rounded-lg border border-task-card-border px-3 text-xs font-semibold text-ink disabled:opacity-50">
                    {f.status === "open" ? "Mark resolved" : "Reopen"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
        {data && <Pagination page={page} pageCount={Math.max(1, Math.ceil(data.total / LIMIT))} onPageChange={setPage} summary={`${data.total} item${data.total === 1 ? "" : "s"}`} />}
      </Card>
      <Modal
        open={shot !== null}
        onClose={() => {
          if (shot) URL.revokeObjectURL(shot);
          setShot(null);
        }}
        ariaLabel="Screenshot"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- an object URL, not a static asset */}
        {shot && <img src={shot} alt="Screenshot the student attached" className="max-h-[75vh] w-full rounded-lg object-contain" />}
      </Modal>
    </div>
  );
}
