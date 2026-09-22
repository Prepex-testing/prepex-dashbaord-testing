import { apiRequest, apiUploadText, ApiError } from "@/lib/api/http";
import { DASHBOARD_API_URL } from "@/lib/api/config";
import {
  clearAdminSession,
  getAccessToken,
  getRefreshToken,
  saveAdminTokens,
} from "@/lib/auth/adminSession";

/**
 * Sends the browser to the login screen after the session has been rejected.
 *
 * A full page load rather than a router push, and deliberately so: this runs
 * from a plain module with no access to the router, and a forced sign-out
 * should discard every piece of in-memory state — cached student rows, a
 * half-filled form — rather than leave it mounted behind the login screen.
 */
function redirectToLogin() {
  if (typeof window === "undefined") return;
  if (window.location.pathname === "/login") return;
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination -- see above: a hard reload is the point.
  window.location.assign("/login");
}

let refreshPromise: Promise<string> | null = null;

/**
 * A page load fires several authenticated requests at once (the overview, the
 * student list, the content counts). If the access token has expired they'd
 * all 401 together and each would independently call /admin/refresh with the
 * same refresh token — but dashboard-service rotates refresh tokens on use, so
 * only the first would succeed and the rest would force a logout, even though
 * the first had just re-established a valid session. Sharing one in-flight
 * promise means the token is only ever consumed once.
 */
function refreshAccessTokenOnce(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = getRefreshToken();
      if (!refreshToken) throw new ApiError(401, "No refresh token");

      const { data } = await apiRequest<{ tokens: { accessToken: string; refreshToken: string } }>(
        `${DASHBOARD_API_URL}/admin/refresh`,
        { method: "POST", body: JSON.stringify({ refreshToken }) },
      );
      if (!data?.tokens) throw new ApiError(401, "Refresh returned no tokens");

      saveAdminTokens(data.tokens);
      return data.tokens.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

/**
 * Runs `attempt` with the current access token and, on a 401, refreshes once
 * and retries. If the refresh token itself is rejected the session is cleared
 * and the browser goes to /login — otherwise that failure would surface as an
 * unhandled rejection instead of a sign-out.
 */
async function withRefresh<T>(attempt: (accessToken: string | null) => Promise<T>): Promise<T> {
  try {
    return await attempt(getAccessToken());
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;

    if (!getRefreshToken()) {
      clearAdminSession();
      redirectToLogin();
      throw err;
    }

    let newAccessToken: string;
    try {
      newAccessToken = await refreshAccessTokenOnce();
    } catch (refreshErr) {
      // Nothing recoverable client-side once the refresh token is rejected.
      // Scoped to the refresh alone: a failure of the retried call below is a
      // separate problem and shouldn't force a sign-out.
      clearAdminSession();
      redirectToLogin();
      throw refreshErr;
    }

    return await attempt(newAccessToken);
  }
}

/** Every admin-only call goes through here, so the token handling lives in one place. */
export async function adminRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data } = await withRefresh((accessToken) =>
    apiRequest<T>(`${DASHBOARD_API_URL}${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${accessToken}`, ...options.headers },
    }),
  );
  return data as T;
}

/** The same token handling for the raw-text bulk upload routes. */
export async function adminUploadText<T>(path: string, text: string): Promise<T> {
  const { data } = await withRefresh((accessToken) =>
    apiUploadText<T>(`${DASHBOARD_API_URL}${path}`, text, {
      headers: { Authorization: `Bearer ${accessToken}` },
    }),
  );
  return data as T;
}

/** For the routes that take no token: login, and the whole forgot-password flow. */
export async function publicRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const { data } = await apiRequest<T>(`${DASHBOARD_API_URL}${path}`, options);
  return data as T;
}

/** Same, for routes that reply with only a message and no data. */
export async function publicMessageRequest(
  path: string,
  options: RequestInit = {},
): Promise<string | undefined> {
  const { message } = await apiRequest<never>(`${DASHBOARD_API_URL}${path}`, options);
  return message;
}
