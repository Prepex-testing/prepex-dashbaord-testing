"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { OtpInput } from "@/components/ui/OtpInput";
import { enableTwoFactor, startTwoFactorSetup } from "@/lib/api/adminAuth";
import { ApiError } from "@/lib/api/http";
import { useAdminSession } from "@/lib/auth/adminSession";

/**
 * Launch step 1 (C6): two-factor sign-in for admins. Setup shows a secret for any authenticator app (Google
 * Authenticator, Authy, 1Password); it only turns on once the app's code is confirmed, so a half-finished setup never
 * locks anyone out. After that, every sign-in asks for the current code.
 */
export default function TwoFactorPage() {
  const session = useAdminSession();
  const [setup, setSetup] = useState<{ secret: string; otpauthUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const alreadyOn = (session as { twoFactorEnabled?: boolean } | null)?.twoFactorEnabled === true;

  const message = (err: unknown) => (err instanceof ApiError ? err.message : "Could not reach the server. Try again.");

  const start = async () => {
    setBusy(true);
    setError(null);
    try {
      setSetup(await startTwoFactorSetup());
    } catch (err) {
      setError(err instanceof ApiError && err.code === "totp_already_on" ? null : message(err));
      if (err instanceof ApiError && err.code === "totp_already_on") setDone(true);
    } finally {
      setBusy(false);
    }
  };

  const confirm = async () => {
    if (code.length !== 6) return setError("Enter the 6-digit code your app shows now.");
    setBusy(true);
    setError(null);
    try {
      await enableTwoFactor(code);
      setDone(true);
      setSetup(null);
    } catch (err) {
      setError(message(err));
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-4 sm:p-6 lg:p-8">
      <PageHeader title="Two-factor sign-in" subtitle="A code from your phone at every sign-in, on top of your password." />
      <Card>
        <div className="flex max-w-xl flex-col gap-4 p-5">
          {error ? (
            <p role="alert" className="rounded-lg bg-danger-bg px-3 py-2 text-xs font-medium text-danger">
              {error}
            </p>
          ) : null}

          {done || alreadyOn ? (
            <p className="text-sm font-semibold text-ink" data-testid="totp-on">
              Two-factor sign-in is on. Every sign-in now asks for the code from your authenticator app.
            </p>
          ) : setup ? (
            <>
              <ol className="list-decimal space-y-2 pl-5 text-sm text-ink">
                <li>Open your authenticator app and add an account with a setup key (or tap the link on this phone).</li>
                <li>
                  Setup key:{" "}
                  <code className="select-all break-all rounded bg-black/5 px-2 py-1 font-mono text-[13px] tracking-wider" data-testid="totp-secret">
                    {setup.secret.replace(/(.{4})/g, "$1 ").trim()}
                  </code>
                </li>
                <li>Type the 6-digit code the app shows now.</li>
              </ol>
              <a href={setup.otpauthUrl} className="text-sm font-semibold text-ink underline">
                Open in authenticator app
              </a>
              <OtpInput value={code} onChange={setCode} />
              <div>
                <Button onClick={confirm} disabled={busy || code.length !== 6}>
                  {busy ? "Checking..." : "Turn on two-factor sign-in"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <p className="text-sm text-muted">
                You will need an authenticator app on your phone. Once it is on, a stolen password alone can&apos;t open the admin
                dashboard.
              </p>
              <div>
                <Button onClick={start} disabled={busy}>
                  {busy ? "Starting..." : "Set up two-factor sign-in"}
                </Button>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  );
}
