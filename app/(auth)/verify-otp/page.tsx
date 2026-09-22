"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { AuthCard } from "@/components/layout/AuthCard";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "@/components/ui/OtpInput";
import { resendResetOtp, verifyResetOtp } from "@/lib/api/adminAuth";
import { savePendingReset } from "@/lib/auth/passwordReset";
import { ApiError } from "@/lib/api/http";

const RESEND_COUNTDOWN_SECONDS = 45;

export default function VerifyOtpPage() {
  return (
    <Suspense fallback={<AuthCard>{null}</AuthCard>}>
      <VerifyOtpForm />
    </Suspense>
  );
}

function VerifyOtpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") ?? "";

  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const [countdown, setCountdown] = useState(RESEND_COUNTDOWN_SECONDS);

  useEffect(() => {
    if (countdown === 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : prev));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleResend = async () => {
    setError(null);
    setResendMessage(null);
    try {
      await resendResetOtp(email);
      setResendMessage(`A new code has been sent to ${email || "your email"}.`);
      // Only start the countdown once the server has accepted the resend —
      // starting it first would lock the button after a failed attempt.
      setCountdown(RESEND_COUNTDOWN_SECONDS);
    } catch (err) {
      // A 429 carries the server's own remaining-seconds message, which is
      // more accurate than this screen's countdown.
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not reach the server. Check your connection and try again.",
      );
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
      const { resetToken } = await verifyResetOtp(email, otp);
      // Handed to the next screen out of band — see lib/auth/passwordReset.
      savePendingReset({ email, resetToken });
      router.push("/reset-password");
    } catch (err) {
      setSubmitting(false);
      setError(
        err instanceof ApiError
          ? err.message
          : "Could not reach the server. Check your connection and try again.",
      );
    }
  };

  return (
    <AuthCard>
      <div className="flex flex-col items-center gap-1">
        <Logo size="compact" showTagline={false} />
      </div>

      <div className="mt-10 flex flex-col items-center gap-6 sm:mt-12 sm:gap-8">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-[24px] font-bold leading-[32px] tracking-[-0.48px] text-ink sm:text-[32px] sm:leading-[40px] sm:tracking-[-0.64px]">
            Verify it&apos;s you
          </h1>

          <p className="max-w-[320px] text-center text-[14px] font-normal leading-[20px] text-muted sm:max-w-[420px] sm:text-[16px] sm:leading-[24px]">
            We&apos;ve sent a 6-digit code to{" "}
            <span className="font-medium text-ink">{email || "your email"}</span>.
            Enter it below to continue.
          </p>
        </div>

        {error && (
          <motion.p
            role="alert"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-[465px] rounded-lg bg-danger-bg px-3 py-2 text-center text-xs font-medium text-danger"
          >
            {error}
          </motion.p>
        )}

        {resendMessage && (
          <motion.p
            role="status"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-[465px] rounded-lg bg-success-bg px-3 py-2 text-center text-xs font-medium text-success"
          >
            {resendMessage}
          </motion.p>
        )}

        <div className="flex w-full max-w-[465px] flex-col items-center gap-5 sm:gap-6">
          <OtpInput value={otp} onChange={setOtp} />

          <div className="flex w-full flex-col items-center gap-3">
            <p className="px-2 pb-2 text-center text-[13px] font-semibold leading-[18px] sm:pb-4 sm:text-[14px] sm:leading-[20px]">
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

            <Button
              variant="primary"
              onClick={handleVerify}
              disabled={isSubmitting}
              className="h-[52px] w-full rounded-2xl text-[15px] font-bold disabled:cursor-not-allowed disabled:opacity-60 sm:h-[57px] sm:text-[16px]"
            >
              {isSubmitting ? "Verifying..." : "Verify & Continue"}
            </Button>

            <Link
              href="/forgot-password"
              className="text-[14px] font-bold leading-[100%] text-muted hover:text-ink dark:text-ink sm:text-[16px]"
            >
              Change Email
            </Link>
          </div>
        </div>
      </div>
    </AuthCard>
  );
}
