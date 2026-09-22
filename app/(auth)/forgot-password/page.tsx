"use client";

import { Suspense, useState } from "react";
import type { SubmitEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { AuthCard } from "@/components/layout/AuthCard";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MailIcon, ArrowLeftIcon } from "@/components/ui/icons";
import { forgotPassword } from "@/lib/api/adminAuth";
import { ApiError } from "@/lib/api/http";

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<AuthCard>{null}</AuthCard>}>
      <ForgotPasswordForm />
    </Suspense>
  );
}

function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const address = email.trim();
    if (!address) {
      setError("Enter the email address on your admin account.");
      return;
    }

    setSubmitting(true);
    try {
      await forgotPassword(address);
      // The API deliberately succeeds whether or not the address belongs to
      // an admin, so this always advances — telling the caller which
      // addresses exist would turn this screen into an account directory.
      router.push(`/verify-otp?email=${encodeURIComponent(address)}&flow=reset`);
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
      <div className="flex flex-col items-center gap-6">
        <Logo size="compact" showTagline={false} />

        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-h1 text-ink">Forgot password?</h1>
          <p className="max-w-[400px] text-sm text-muted">
            Enter your admin email and we&apos;ll send a 6-digit verification
            code to reset your password.
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
          label="Email Address"
          icon={<MailIcon />}
          name="email"
          type="email"
          autoComplete="email"
          placeholder="admin@prepex.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />

        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          className="disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Sending..." : "Send Verification Code"}
        </Button>
      </form>

      <p className="mt-8 text-center text-sm text-muted">
        <Link
          href="/login"
          className="inline-flex items-center gap-1 font-semibold text-ink underline"
        >
          <ArrowLeftIcon />
          Back to Sign In
        </Link>
      </p>
    </AuthCard>
  );
}
