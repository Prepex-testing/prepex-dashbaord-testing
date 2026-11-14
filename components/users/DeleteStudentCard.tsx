"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { deleteStudentForGood } from "@/lib/api/students";
import { useAdminSession } from "@/lib/auth/adminSession";

/**
 * Launch step 1 (C12): the one admin action that removes everything Prepex holds about a student (most are minors):
 * account, profile, notebooks and photos, logs, plans, social links. Shown to superadmins only (the server enforces it
 * too) and the admin must type the student's e-mail to enable it.
 */
export function DeleteStudentCard({ studentId, email, name }: { studentId: string; email: string; name: string }) {
  const session = useAdminSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!session?.isSuperadmin) return null;

  const matches = typed.trim().toLowerCase() === email.trim().toLowerCase();
  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteStudentForGood(studentId, typed);
      router.replace("/users");
    } catch (err) {
      setError(err instanceof Error ? err.message : "The student could not be deleted. Try again.");
      setBusy(false);
    }
  };

  return (
    <section className="rounded-2xl border border-red-300/60 p-5 dark:border-red-400/40">
      <h2 className="text-base font-bold text-body-text dark:text-ink">Delete this student for good</h2>
      <p className="pt-1 text-sm text-muted">
        Removes the account and everything in it: profile, notebooks and photos, study logs, plans, mocks, and follows.
        This cannot be undone.
      </p>
      <div className="pt-4">
        <Button variant="secondary" onClick={() => setOpen(true)}>
          Delete student…
        </Button>
      </div>
      <Modal open={open} onClose={() => !busy && setOpen(false)} ariaLabel="Delete student for good">
        <div className="flex flex-col gap-4">
          <h2 className="text-[20px] font-extrabold text-modal-text">Delete {name} for good?</h2>
          <p className="text-sm text-modal-subtext">
            Type the student&apos;s e-mail address to confirm. Everything they have in Prepex is removed and cannot be
            brought back.
          </p>
          <Input label="Student e-mail" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          {error ? (
            <p role="alert" className="text-sm font-semibold text-red-600">
              {error}
            </p>
          ) : null}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button onClick={run} disabled={!matches || busy}>
              {busy ? "Deleting…" : "Delete for good"}
            </Button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
