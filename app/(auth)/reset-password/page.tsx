"use client";

import { Suspense, useState } from "react";
import type { SubmitEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { AuthCard } from "@/components/layout/AuthCard";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { LockIcon, CheckCircleIcon } from "@/components/ui/icons";
import { validateNewPassword } from "@/lib/auth/password";
import { resetPassword } from "@/lib/api/adminAuth";
import { clearPendingReset, readPendingReset } from "@/lib/auth/passwordReset";
import { ApiError } from "@/lib/api/http";

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<AuthCard>{null}</AuthCard>}>
      <ResetPasswordForm />
    </Suspense>
  );
}

function ResetPasswordForm() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [isReset, setReset] = useState(false);

  // Read on submit rather than into state: this screen is only reachable
  // straight after the code was verified, and reading it lazily keeps the
  // token out of the render tree.
  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    const problem = validateNewPassword(password, confirmPassword);
    if (problem) {
      setError(problem);
      return;
    }

    const pending = readPendingReset();
    if (!pending) {
      // Landed here directly, or the tab was reopened — there is no verified
      // code to spend, so the only way forward is to start again.
      setError("This reset link has expired. Please request a new code.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      await resetPassword(pending.resetToken, password);
      // Single-use server-side; dropping it locally too stops a second
      // submit from replaying a token that is already spent.
      clearPendingReset();
      setReset(true);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not reach the server. Check your connection and try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (isReset) {
    return (
      <AuthCard>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 220, damping: 20 }}
          className="flex flex-col items-center gap-4 text-center"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-bg text-success">
            <CheckCircleIcon className="h-7 w-7" />
          </span>
          <h1 className="text-h1 text-ink">Password updated</h1>
          <p className="max-w-[380px] text-sm text-muted">
            Your password has been changed. Sign in with your new password to
            continue.
          </p>
          <Button
            variant="primary"
            className="mt-2 w-full max-w-[280px]"
            onClick={() => router.push("/login")}
          >
            Back to Sign In
          </Button>
        </motion.div>
      </AuthCard>
    );
  }

  return (
    <AuthCard>
      <div className="flex flex-col items-center gap-6">
        <Logo size="compact" showTagline={false} />

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-h1 text-ink">Set a new password</h1>
          <p className="max-w-[400px] text-sm text-muted">
            Choose a password you haven&apos;t used before on this account.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto mt-8 flex w-full max-w-[460px] flex-col gap-5">
        {error && (
          <motion.p
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger"
          >
            {error}
          </motion.p>
        )}

        <Input
          label="New Password"
          helperText="At least 8 characters with one uppercase letter and one number"
          icon={<LockIcon />}
          name="password"
          type="password"
          autoComplete="new-password"
          placeholder="At least 8 characters"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />

        <Input
          label="Confirm New Password"
          icon={<LockIcon />}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          placeholder="Re-enter password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          minLength={8}
          required
        />

        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          className="disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Updating..." : "Update Password"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        Remembered your password?{" "}
        <Link href="/login" className="font-semibold text-ink underline">
          Sign In
        </Link>
      </p>
    </AuthCard>
  );
}
