"use client";

import { useEffect, useState } from "react";
import type { SubmitEvent } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { AuthCard } from "@/components/layout/AuthCard";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { MailIcon, LockIcon } from "@/components/ui/icons";
import { saveAdminSession, useAdminSession, useHasHydrated } from "@/lib/auth/adminSession";
import { login } from "@/lib/api/adminAuth";
import { ApiError } from "@/lib/api/http";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setSubmitting] = useState(false);
  const session = useAdminSession();
  const hasHydrated = useHasHydrated();

  // Already signed in (e.g. opened / or /login with a live session): straight
  // to the dashboard rather than asking for a password that's already proven.
  // Waits for hydration — before it, the session always reads as absent.
  useEffect(() => {
    if (hasHydrated && session) router.replace("/dashboard");
  }, [hasHydrated, session, router]);

  const handleForgotPassword = () => {
    // Carrying the typed email forward saves retyping it on the next screen.
    const query = email.trim() ? `?email=${encodeURIComponent(email.trim())}` : "";
    router.push(`/forgot-password${query}`);
  };

  const handleSubmit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError("Enter your email address and password to continue.");
      return;
    }

    setSubmitting(true);
    try {
      const { admin, tokens } = await login(email.trim(), password);
      saveAdminSession(admin, tokens);
      router.push("/dashboard");
    } catch (err) {
      // The submitting flag is only cleared on failure: on success the route
      // change is already under way, and re-enabling the button first lets a
      // second submit through on a slow navigation.
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
          <h1 className="text-h1 text-ink">Admin sign in</h1>
          <p className="max-w-[380px] text-sm text-muted">
            Use your administrator account to manage prepex.
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

        <div className="flex flex-col gap-2">
          <Input
            label="Password"
            icon={<LockIcon />}
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="Enter password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
          <button
            type="button"
            onClick={handleForgotPassword}
            className="self-end text-xs font-semibold text-ink underline"
          >
            Forgot password?
          </button>
        </div>

        <Button
          type="submit"
          variant="primary"
          disabled={isSubmitting}
          className="disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Signing in..." : "Sign In"}
        </Button>
      </form>

      <p className="mt-8 border-t border-tint pt-5 text-center text-xs font-medium text-muted">
        Admin accounts are created by the prepex team. Contact your
        administrator if you need access.
      </p>
    </AuthCard>
  );
}
