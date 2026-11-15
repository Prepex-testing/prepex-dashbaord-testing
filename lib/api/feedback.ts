import { adminBlobUrl, adminRequest } from "@/lib/api/adminRequest";

/** Launch step 2 (B2): the feedback inbox — GET/PATCH /admin/feedback, GET /admin/feedback/:id/screenshot. */
export type FeedbackType = "bug" | "idea" | "other";
export type FeedbackStatus = "open" | "resolved";
export type FeedbackItem = {
  id: string;
  userId: string;
  type: FeedbackType;
  message: string;
  route: string | null;
  appVersion: string | null;
  device: string | null;
  status: FeedbackStatus;
  createdAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
  hasScreenshot: boolean;
};
export type FeedbackPage = { items: FeedbackItem[]; total: number; page: number; limit: number };

export function listFeedback(q: { type?: FeedbackType; status?: FeedbackStatus; page: number; limit: number }) {
  const p = new URLSearchParams({ page: String(q.page), limit: String(q.limit) });
  if (q.type) p.set("type", q.type);
  if (q.status) p.set("status", q.status);
  return adminRequest<FeedbackPage>(`/admin/feedback?${p.toString()}`);
}

export const setFeedbackStatus = (id: string, status: FeedbackStatus) =>
  adminRequest<{ id: string; status: FeedbackStatus }>(`/admin/feedback/${encodeURIComponent(id)}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });

export const feedbackScreenshotUrl = (id: string) => adminBlobUrl(`/admin/feedback/${encodeURIComponent(id)}/screenshot`);
