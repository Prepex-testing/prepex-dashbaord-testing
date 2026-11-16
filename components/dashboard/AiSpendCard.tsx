"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { getAiUsage, type AiStudentsToday, type AiUsage } from "@/lib/api/overview";

const usd = (n: number) => `$${n.toFixed(2)}`;
/** Student amounts are often fractions of a cent. */
const usdFine = (n: number) => `$${n.toFixed(n > 0 && n < 0.1 ? 3 : 2)}`;

const ALERT_TEXT: Record<AiUsage["today"]["alert"], string | null> = {
  none: null,
  "50%": "Half of today's AI budget is used.",
  "90%": "90% of today's AI budget is used.",
  cap: "Today's AI budget is used up. AI features are paused until midnight IST.",
};

/**
 * Launch step 2 (1d, C4): today's AI spend against the hard daily cap. The same alert levels also go to Sentry and the
 * support mailbox; this card is where an admin sees them without opening either. Post-launch: also each student's
 * spend against the per-student cap (top 10 today, and how many hit it).
 */
export function AiSpendCard() {
  const [usage, setUsage] = useState<AiUsage | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    getAiUsage()
      .then((u) => {
        if (!controller.signal.aborted) setUsage(u);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      });
    return () => controller.abort();
  }, []);

  const t = usage?.today;
  const alert = t ? ALERT_TEXT[t.alert] : null;
  const bar = !t ? "" : t.alert === "cap" ? "bg-danger" : t.alert === "90%" ? "bg-warning" : "bg-brand";

  return (
    <Card>
      <CardHeader title="AI spend today" subtitle="Hard daily cap; resets at midnight IST" />
      {failed ? (
        <p className="text-sm text-muted">AI spend could not be loaded.</p>
      ) : !t || !usage ? (
        <Skeleton className="h-16 w-full rounded-xl" />
      ) : (
        <div className="flex flex-col gap-3" data-testid="ai-spend">
          <p className="text-2xl font-bold text-ink">
            {usd(t.costUsd)} <span className="text-sm font-medium text-muted">of {usd(t.capUsd)} ({t.percent}%)</span>
          </p>
          <div
            className="h-2 w-full overflow-hidden rounded-full bg-black/5"
            role="progressbar"
            aria-label="AI budget used"
            aria-valuenow={t.percent}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className={`h-full ${bar}`} style={{ width: `${t.percent}%` }} />
          </div>
          <p className="text-xs text-muted">
            {t.calls.toLocaleString()} AI calls today{t.refused > 0 ? `, ${t.refused.toLocaleString()} refused at the cap` : ""}
          </p>
          {alert && (
            <p
              role="status"
              className={`rounded-lg px-3 py-2 text-xs font-medium ${
                t.alert === "cap" ? "bg-danger-bg text-danger" : t.alert === "90%" ? "bg-warning-bg text-warning" : "bg-black/5 text-ink"
              }`}
            >
              {alert}
            </p>
          )}
          {usage.perStudent && <StudentSpend s={usage.perStudent} />}
          {usage.days.length > 1 && (
            <ul className="flex flex-col gap-1 text-xs text-muted" aria-label="Earlier days">
              {usage.days.slice(1, 7).map((d) => (
                <li key={d.day} className="flex justify-between">
                  <span>{d.day}</span>
                  <span>
                    {usd(d.costUsd)}
                    {d.refused > 0 ? ` · ${d.refused} refused` : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Card>
  );
}

/** Today's per-student spend: how many used AI, how many hit the per-student cap, and the top 10 by spend. */
function StudentSpend({ s }: { s: AiStudentsToday }) {
  return (
    <div className="flex flex-col gap-2 border-t border-black/5 pt-3" data-testid="ai-spend-students">
      <p className="text-xs font-semibold text-ink">
        Per student (cap {usd(s.capUsd)} a day)
      </p>
      <p className="text-xs text-muted">
        {s.students.toLocaleString()} {s.students === 1 ? "student" : "students"} used AI today
        {" · "}
        <span className={s.capped > 0 ? "font-medium text-warning" : undefined}>
          {s.capped.toLocaleString()} hit the cap
        </span>
      </p>
      {s.top.length > 0 && (
        <ol className="flex flex-col gap-1 text-xs" aria-label="Top students by AI spend today">
          {s.top.map((t) => (
            <li key={t.userId} className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate text-ink" title={t.email ?? t.userId}>
                {t.name || t.email || t.userId.slice(0, 8)}
              </span>
              <span className="shrink-0 tabular-nums text-muted">
                {usdFine(t.costUsd)} · {t.calls} {t.calls === 1 ? "call" : "calls"}
                {t.capped ? <span className="ml-1 font-medium text-warning">capped</span> : null}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
