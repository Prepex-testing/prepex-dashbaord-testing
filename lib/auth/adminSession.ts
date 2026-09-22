"use client";

import { useSyncExternalStore } from "react";

/**
 * The signed-in admin: the tokens dashboard-service issued at login, plus the
 * admin record it returned alongside them.
 *
 * Kept in localStorage rather than a cookie because the dashboard is a static
 * client app talking to a separate origin — there is no Next server in the
 * request path to read a cookie, and the access token has to be attached to
 * every call by hand anyway.
 */

const STORAGE_KEY = "prepex-admin-session";
const CHANGE_EVENT = "prepex-admin-session-change";

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  isSuperadmin: boolean;
};

export type AdminTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AdminSession = AdminUser & AdminTokens;

const EMPTY_SESSION: AdminSession | null = null;

function readSession(): AdminSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AdminSession>;
    // A session without tokens can't authenticate anything, so it counts as
    // signed out rather than as a half-usable session.
    if (typeof parsed?.email !== "string" || typeof parsed?.accessToken !== "string") {
      return null;
    }
    return {
      id: parsed.id ?? "",
      name: parsed.name ?? "Admin",
      email: parsed.email,
      isSuperadmin: parsed.isSuperadmin ?? false,
      accessToken: parsed.accessToken,
      refreshToken: parsed.refreshToken ?? "",
    };
  } catch {
    // Unparseable or unavailable storage — treat it as signed out.
    return null;
  }
}

// useSyncExternalStore compares snapshots by identity, so a fresh object every
// read would loop forever. Parse once per change and hand back the same
// reference until something writes.
let cachedRaw: string | null = null;
let cachedSession: AdminSession | null = null;

function getSessionSnapshot(): AdminSession | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return EMPTY_SESSION;
  }
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cachedSession = readSession();
  }
  return cachedSession;
}

function getSessionServerSnapshot(): AdminSession | null {
  return EMPTY_SESSION;
}

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener(CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(CHANGE_EVENT, onChange);
  };
}

function writeSession(session: AdminSession | null) {
  try {
    if (session) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage unavailable — the session just won't survive a reload.
  }
  // Same-tab writes don't fire the native `storage` event, so the hooks
  // reading this store are nudged explicitly.
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function saveAdminSession(admin: AdminUser, tokens: AdminTokens) {
  writeSession({ ...admin, ...tokens });
}

/** Called after a refresh rotates the pair, leaving the admin record alone. */
export function saveAdminTokens(tokens: AdminTokens) {
  const current = readSession();
  if (!current) return;
  writeSession({ ...current, ...tokens });
}

export function clearAdminSession() {
  writeSession(null);
}

/**
 * Read outside React — the request helpers need the token without being
 * hooks.
 */
export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return readSession()?.accessToken ?? null;
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return readSession()?.refreshToken || null;
}

export function useAdminSession(): AdminSession | null {
  return useSyncExternalStore(subscribe, getSessionSnapshot, getSessionServerSnapshot);
}

const subscribeNoop = () => () => {};

/**
 * False while React is hydrating — i.e. in exactly the renders where
 * useAdminSession is still reporting the server snapshot (null) rather than
 * what's in localStorage — and true from then on.
 *
 * "No session" can only be trusted once this is true. Both hooks are
 * useSyncExternalStore, so they switch from server to client snapshots in the
 * same render and can never disagree.
 */
export function useHasHydrated(): boolean {
  return useSyncExternalStore(
    subscribeNoop,
    () => true,
    () => false,
  );
}

/** Name to greet, falling back to something sensible before a session exists. */
export function useAdminDisplayName(): string {
  const session = useAdminSession();
  return session?.name?.trim() || "Admin";
}
