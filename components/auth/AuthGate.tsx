"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAdminSession, useHasHydrated } from "@/lib/auth/adminSession";
import { getProfile } from "@/lib/api/adminAuth";

/**
 * Keeps the dashboard's pages behind a session.
 *
 * The session lives in localStorage, which doesn't exist during the server
 * render. On a page load React hydrates with the server snapshot, so the first
 * commit — and the effects it runs — sees "signed out" even when the admin is
 * signed in; the real session only arrives in the render after. Redirecting on
 * that first commit bounced every signed-in admin to /login on refresh, so the
 * redirect waits for useHasHydrated, and nothing is rendered until it's known.
 *
 * This is a convenience, not the security boundary: every admin route on
 * dashboard-service verifies the access token itself.
 */
export function AuthGate({ children }: { children: ReactNode }) {
  const session = useAdminSession();
  const hasHydrated = useHasHydrated();
  const router = useRouter();

  useEffect(() => {
    if (hasHydrated && !session) router.replace("/login");
  }, [hasHydrated, session, router]);

  // Stored tokens can be stale in ways only the server knows about — a
  // password changed from another tab or by another admin revokes them.
  // Checking once on mount refreshes or signs out through the request
  // wrapper's own 401 handling, instead of letting the admin click into a
  // page that then fails. Deliberately not awaited: a valid session renders
  // immediately and this settles behind it.
  // Depended on by id rather than by the whole session, so the check runs on
  // mount and when a different admin signs in — not on every token rotation,
  // which replaces the session object without changing who is signed in.
  const adminId = session?.id;

  useEffect(() => {
    if (!adminId) return;
    void getProfile().catch(() => {
      // The wrapper has already refreshed the token or redirected to /login.
      // Anything left here is a transient network failure, which shouldn't
      // throw an admin out of a session that may well be fine.
    });
  }, [adminId]);

  // Blank rather than a spinner: the redirect is immediate, and a flash of
  // loading UI on the way to the login screen reads as a failure.
  if (!session) return null;

  return <>{children}</>;
}
