"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { getAiUsage, type AiUsage } from "@/lib/api/overview";

const usd = (n: number) => `$${n.toFixed(2)}`;

const ALERT_TEXT: Record<AiUsage["today"]["alert"], string | null> = {
  none: null,
  "50%": "Half of today's AI budget is used.",
  "90%": "90% of today's AI budget is used.",
  cap: "Today's AI budget is used up. AI features are paused until midnight IST.",
};

/**
 * Launch step 2 (1d, C4): today's AI spend against the hard daily cap. The same alert levels also go to Sentry and the
 * support mailbox; this card is where an admin sees them without opening either.
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
