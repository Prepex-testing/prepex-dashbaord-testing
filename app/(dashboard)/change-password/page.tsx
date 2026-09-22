"use client";

import { useEffect, useState } from "react";
import type { SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { OtpInput } from "@/components/ui/OtpInput";
import {
  LockIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ShieldIcon,
} from "@/components/ui/icons";
import { validateNewPassword } from "@/lib/auth/password";
import { clearAdminSession, useAdminSession } from "@/lib/auth/adminSession";
import {
  confirmPasswordChange,
  requestPasswordChange,
  resendPasswordChangeOtp,
} from "@/lib/api/adminAuth";
import { ApiError } from "@/lib/api/http";

const RESEND_COUNTDOWN_SECONDS = 45;

/**
 * Three steps in one page rather than three routes: changing a password while
 * already signed in is a single task, and keeping it in place means the
 * dashboard shell never unmounts underneath it.
 */
type Step = "form" | "otp" | "done";

export default function ChangePasswordPage() {
  const router = useRouter();
  const session = useAdminSession();

  const [step, setStep] = useState<Step>("form");
  const [currentPassword, setCurrentPassword] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(RESEND_COUNTDOWN_SECONDS);
  const [isSubmitting, setSubmitting] = useState(false);

  const describeError = (err: unknown) =>
    err instanceof ApiError
      ? err.message
      : "Could not reach the server. Check your connection and try again.";

  useEffect(() => {
    if (step !== "otp" || countdown === 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : prev));
    }, 1000);
    return () => clearInterval(timer);
  }, [step, countdown]);

  const handleFormSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!currentPassword) {
      setError("Enter your current password.");
      return;
    }
    const problem = validateNewPassword(password, confirmPassword);
    if (problem) {
      setError(problem);
      return;
    }
    if (currentPassword === password) {
      setError("Your new password must be different from the current one.");
      return;
    }

    setError(null);
    setSubmitting(true);
    try {
      // Checks the current password and emails a code. The new password is
      // hashed and parked server-side; nothing changes until the code is
      // confirmed, so a wrong current password is caught here rather than
      // three steps later.
      await requestPasswordChange(currentPassword, password);
      setOtp("");
      setCountdown(RESEND_COUNTDOWN_SECONDS);
      setStep("otp");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) {
      setError("Enter the 6-digit code.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await confirmPasswordChange(otp);
      // Confirming revokes every session server-side, so the stored tokens
      // are already dead. They're cleared on the way out rather than here:
      // clearing them now would trip the AuthGate around this page and
      // redirect to /login before the confirmation card could be read.
      setStep("done");
    } catch (err) {
      setError(describeError(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    setError(null);
    setResendMessage(null);
    try {
      await resendPasswordChangeOtp();
      setResendMessage(`A new code has been sent to ${session?.email || "your email"}.`);
      // Started only once the server accepts, so a rejected resend doesn't
      // lock the button for 45 seconds.
      setCountdown(RESEND_COUNTDOWN_SECONDS);
    } catch (err) {
      setError(describeError(err));
    }
  };

  return (
    <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
      <PageHeader
        title="Change Password"
        subtitle="Update the password for your admin account."
      />

      <div className="mx-auto w-full max-w-[560px]">
        <AnimatePresence mode="wait">
          {step === "form" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ type: "spring", stiffness: 90, damping: 18 }}
            >
              <Card>
                <div className="mb-6 flex flex-col items-center gap-2 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-tint-strong text-ink">
                    <LockIcon />
                  </span>
                  <h2 className="text-xl font-bold text-ink">Set a new password</h2>
                  <p className="max-w-[380px] text-sm text-muted">
                    We&apos;ll email a 6-digit code to confirm the change before
                    it takes effect.
                  </p>
                </div>

                <form onSubmit={handleFormSubmit} className="flex flex-col gap-5">
                  {error && <ErrorNote message={error} />}

                  <Input
                    label="Current Password"
                    icon={<LockIcon />}
                    name="currentPassword"
                    type="password"
                    autoComplete="current-password"
                    placeholder="Enter current password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    required
                  />

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
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    minLength={8}
                    required
                  />

                  <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                    <Button
                      variant="secondary"
                      className="sm:flex-1"
                      onClick={() => router.push("/dashboard")}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      className="sm:flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Sending code..." : "Continue"}
                    </Button>
                  </div>
                </form>
              </Card>
            </motion.div>
          )}

          {step === "otp" && (
            <motion.div
              key="otp"
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -24 }}
              transition={{ type: "spring", stiffness: 90, damping: 18 }}
            >
              <Card>
                <div className="flex flex-col items-center gap-6">
                  <div className="flex flex-col items-center gap-2 text-center">
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-tint-strong text-ink">
                      <ShieldIcon className="h-5 w-5" />
                    </span>
                    <h2 className="text-xl font-bold text-ink">Verify it&apos;s you</h2>
                    <p className="max-w-[380px] text-sm text-muted">
                      Enter the 6-digit code sent to{" "}
                      <span className="font-medium text-ink">
                        {session?.email || "your email"}
                      </span>
                      .
                    </p>
                  </div>

                  {error && <ErrorNote message={error} />}

                  {resendMessage && (
                    <motion.p
                      role="status"
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full rounded-lg bg-success-bg px-3 py-2 text-center text-xs font-medium text-success"
                    >
                      {resendMessage}
                    </motion.p>
                  )}

                  <OtpInput value={otp} onChange={setOtp} />

                  <p className="text-center text-[13px] font-semibold leading-5">
                    Didn&apos;t receive the code?{" "}
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={countdown > 0}
                      className="text-ink underline disabled:cursor-not-allowed disabled:no-underline disabled:opacity-60"
                    >
                      Resend Code
                    </button>{" "}
                    {countdown > 0 && (
                      <span className="whitespace-nowrap text-muted">({countdown} sec)</span>
                    )}
                  </p>

                  <div className="flex w-full flex-col gap-3 sm:flex-row">
                    <Button
                      variant="secondary"
                      className="sm:flex-1"
                      onClick={() => {
                        setError(null);
                        setResendMessage(null);
                        setStep("form");
                      }}
                    >
                      <ArrowLeftIcon />
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      className="sm:flex-1 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={handleVerify}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Updating..." : "Verify & Update"}
                    </Button>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}

          {step === "done" && (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
            >
              <Card>
                <div className="flex flex-col items-center gap-4 py-4 text-center">
                  <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success-bg text-success">
                    <CheckCircleIcon className="h-7 w-7" />
                  </span>
                  <h2 className="text-xl font-bold text-ink">Password updated</h2>
                  <p className="max-w-[380px] text-sm text-muted">
                    Your admin password has been changed. For security, every
                    signed-in session was ended — sign in again with your new
                    password to continue.
                  </p>
                  <Button
                    variant="primary"
                    className="mt-2 w-full max-w-[280px]"
                    onClick={() => {
                      clearAdminSession();
                      router.push("/login");
                    }}
                  >
                    Sign In Again
                  </Button>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ErrorNote({ message }: { message: string }) {
  return (
    <motion.p
      role="alert"
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-lg bg-danger-bg px-3 py-2 text-center text-xs font-medium text-danger"
    >
      {message}
    </motion.p>
  );
}
